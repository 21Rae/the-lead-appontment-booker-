import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import { conversationEngine } from './server/engine';
import { APPROVED_EDUCATIONAL_TOPICS } from './server/knowledge';
import { generateAdviserSummary } from './server/gemini';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();

  app.use(express.json());

  // Periodically sweep abandoned conversations (every 5 mins)
  setInterval(() => {
    db.checkAndMarkAbandoned(30);
  }, 5 * 60 * 1000);

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 1. Visitors: Init / Retrieve / Update
  app.post('/api/visitors', (req, res) => {
    try {
      const { visitor_id, source, campaign, medium, content, landing_page, referrer } = req.body;
      if (!visitor_id) {
        return res.status(400).json({ error: 'visitor_id is required' });
      }

      const visitor = db.getOrCreateVisitor({
        visitor_id,
        source,
        campaign,
        medium,
        content,
        landing_page,
        referrer
      });

      const conversations = db.listVisitorConversations(visitor_id);
      const answers = db.getVisitorAnswers(visitor_id);
      const events = db.getVisitorEvents(visitor_id);

      res.json({
        visitor,
        conversations,
        answers,
        events
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/visitors/:id', (req, res) => {
    try {
      const visitor = db.getVisitor(req.params.id);
      if (!visitor) {
        return res.status(404).json({ error: 'Visitor not found' });
      }

      const conversations = db.listVisitorConversations(visitor.visitor_id);
      const answers = db.getVisitorAnswers(visitor.visitor_id);
      const events = db.getVisitorEvents(visitor.visitor_id);

      res.json({
        visitor,
        conversations,
        answers,
        events
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Email capture: updates existing visitor record without creating new one
  app.post('/api/visitors/:id/email', (req, res) => {
    try {
      const { email, first_name, last_name, phone } = req.body;
      const visitor = db.getVisitor(req.params.id);
      if (!visitor) {
        return res.status(404).json({ error: 'Visitor not found' });
      }

      const updatedVisitor = db.updateVisitor(visitor.visitor_id, {
        email: email || visitor.email,
        first_name: first_name || visitor.first_name,
        last_name: last_name || visitor.last_name,
        phone: phone || visitor.phone
      });

      db.logEvent({
        visitor_id: visitor.visitor_id,
        conversation_id: req.body.conversation_id || 'general',
        event_type: 'email_submitted',
        event_data: { email, first_name, last_name }
      });

      res.json({ success: true, visitor: updatedVisitor });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Conversations: Init / Resume / Load
  app.post('/api/conversations', async (req, res) => {
    try {
      const { visitor_id, conversation_id, source, campaign, medium, content, landing_page, referrer } = req.body;
      if (!visitor_id) {
        return res.status(400).json({ error: 'visitor_id is required' });
      }

      const result = await conversationEngine.initializeConversation({
        visitor_id,
        conversation_id,
        source,
        campaign,
        medium,
        content,
        landing_page,
        referrer
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/conversations/:id', (req, res) => {
    try {
      const conv = db.getConversation(req.params.id);
      if (!conv) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const visitor = db.getVisitor(conv.visitor_id);
      const messages = db.getConversationMessages(conv.conversation_id);
      const answers = db.getConversationAnswers(conv.conversation_id);
      const events = db.getConversationEvents(conv.conversation_id);

      res.json({
        conversation: conv,
        visitor,
        messages,
        answers,
        events
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. MANDATORY CRITICAL ENDPOINT: Immediate Answer Save & Next Step Processing
  app.post('/api/conversations/:id/answers', async (req, res) => {
    try {
      const {
        visitor_id,
        question_id,
        question_text,
        answer_value,
        answer_label,
        raw_answer,
        answer_type,
        stage,
        submission_id
      } = req.body;

      if (!visitor_id || !question_id || !answer_value) {
        return res.status(400).json({ error: 'Missing required answer fields' });
      }

      const result = await conversationEngine.processAnswer({
        visitor_id,
        conversation_id: req.params.id,
        question_id,
        question_text: question_text || question_id,
        answer_value,
        answer_label: answer_label || answer_value,
        raw_answer,
        answer_type: answer_type || 'button',
        stage: stage || 'goal_discovery',
        submission_id
      });

      res.json({
        success: true,
        ...result
      });
    } catch (err: any) {
      console.error('Error saving answer:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Free-text message or question to AI
  app.post('/api/conversations/:id/messages', async (req, res) => {
    try {
      const { visitor_id, text } = req.body;
      if (!visitor_id || !text) {
        return res.status(400).json({ error: 'visitor_id and text are required' });
      }

      const result = await conversationEngine.handleFreeTextInquiry({
        visitor_id,
        conversation_id: req.params.id,
        userText: text
      });

      res.json({
        success: true,
        ...result
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Conversation lifecycle controls: Pause, Resume, Abandon, Complete, Book
  app.post('/api/conversations/:id/pause', (req, res) => {
    try {
      const conv = db.updateConversation(req.params.id, { status: 'paused' });
      if (!conv) return res.status(404).json({ error: 'Conversation not found' });

      db.logEvent({
        visitor_id: conv.visitor_id,
        conversation_id: conv.conversation_id,
        event_type: 'conversation_paused',
        event_data: { stage: conv.current_stage }
      });

      res.json({ success: true, conversation: conv });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/conversations/:id/resume', (req, res) => {
    try {
      const conv = db.updateConversation(req.params.id, { status: 'active' });
      if (!conv) return res.status(404).json({ error: 'Conversation not found' });

      db.logEvent({
        visitor_id: conv.visitor_id,
        conversation_id: conv.conversation_id,
        event_type: 'conversation_resumed',
        event_data: { stage: conv.current_stage }
      });

      res.json({ success: true, conversation: conv });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/conversations/:id/booking', (req, res) => {
    try {
      const { slot, adviser_name } = req.body;
      const conv = db.updateConversation(req.params.id, {
        status: 'booked',
        booking_slot: slot || 'Thursday at 11:00 AM',
        completed_at: new Date().toISOString()
      });

      if (!conv) return res.status(404).json({ error: 'Conversation not found' });

      db.logEvent({
        visitor_id: conv.visitor_id,
        conversation_id: conv.conversation_id,
        event_type: 'booking_completed',
        event_data: { slot, adviser_name: adviser_name || 'Chartered Financial Planner' }
      });

      // Deliver confirmation agent message
      const confirmMsg = db.saveMessage({
        conversation_id: conv.conversation_id,
        visitor_id: conv.visitor_id,
        sender: 'agent',
        mode: 'adviser_connector',
        text: `🎉 **Discovery Consultation Confirmed**\n\nYour 20-minute introductory session has been scheduled for **${slot || 'Thursday at 11:00 AM'}**.\n\nA calendar invitation and pre-meeting briefing have been prepared for your adviser with your goal summary.`
      });

      res.json({ success: true, conversation: conv, message: confirmMsg });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/conversations/:id/complete', (req, res) => {
    try {
      const conv = db.updateConversation(req.params.id, {
        status: 'completed',
        completed_at: new Date().toISOString()
      });
      if (!conv) return res.status(404).json({ error: 'Conversation not found' });

      db.logEvent({
        visitor_id: conv.visitor_id,
        conversation_id: conv.conversation_id,
        event_type: 'conversation_completed'
      });

      res.json({ success: true, conversation: conv });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Educational Topics endpoint
  app.get('/api/education/topics', (req, res) => {
    res.json({ topics: Object.values(APPROVED_EDUCATIONAL_TOPICS) });
  });

  app.get('/api/education/topics/:id', (req, res) => {
    const topic = APPROVED_EDUCATIONAL_TOPICS[req.params.id];
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    res.json({ topic });
  });

  // 7. CRM / Admin Endpoints
  app.get('/api/admin/visitors', (req, res) => {
    try {
      const visitors = db.listVisitors();
      const conversations = db.listAllConversations();

      const enrichedVisitors = visitors.map((v) => {
        const vConvs = db.listVisitorConversations(v.visitor_id);
        const vAnswers = db.getVisitorAnswers(v.visitor_id);
        const vEvents = db.getVisitorEvents(v.visitor_id);

        const latestConv = vConvs[vConvs.length - 1];

        return {
          ...v,
          conversations_count: vConvs.length,
          latest_conversation: latestConv,
          answers: vAnswers,
          events: vEvents,
          qualification_status: latestConv?.qualification_status || 'not_ready',
          next_action: latestConv?.next_action || 'education',
          client_summary: latestConv?.client_summary
        };
      });

      res.json({
        visitors: enrichedVisitors,
        total_count: visitors.length
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/analytics', (req, res) => {
    try {
      const visitors = db.listVisitors();
      const conversations = db.listAllConversations();

      const totalVisitors = visitors.length;
      const totalConversations = conversations.length;
      const qualifiedCount = conversations.filter((c) => c.qualification_status === 'qualified' || c.status === 'booked').length;
      const bookedCount = conversations.filter((c) => c.status === 'booked').length;
      const abandonedCount = conversations.filter((c) => c.status === 'abandoned').length;
      const emailsCaptured = visitors.filter((v) => !!v.email).length;

      // Campaign breakdown
      const campaignStats: Record<string, number> = {};
      conversations.forEach((c) => {
        const camp = c.campaign || 'direct';
        campaignStats[camp] = (campaignStats[camp] || 0) + 1;
      });

      // Stage dropoff
      const stageStats: Record<string, number> = {};
      conversations.forEach((c) => {
        stageStats[c.current_stage] = (stageStats[c.current_stage] || 0) + 1;
      });

      res.json({
        total_visitors: totalVisitors,
        total_conversations: totalConversations,
        qualified_leads: qualifiedCount,
        booked_consultations: bookedCount,
        abandoned_conversations: abandonedCount,
        emails_captured: emailsCaptured,
        conversion_rate: totalVisitors > 0 ? Math.round((qualifiedCount / totalVisitors) * 100) : 0,
        campaigns: campaignStats,
        stages: stageStats
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/reset', (req, res) => {
    try {
      db.resetData();
      res.json({ success: true, message: 'Database reset and re-seeded' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Vite Dev & Production Static Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Financial Conversation Agent server running on http://localhost:${PORT}`);
  });
}

startServer();
