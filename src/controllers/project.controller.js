const ClientProject = require('../models/ClientProject');
const { getRequestUser } = require('../utils/userHelper');

const formatProject = (p) => ({
  id: p._id.toString(),
  clientName: p.clientName,
  projectTitle: p.projectTitle,
  totalValue: p.totalValue,
  payments: (p.payments || []).map((pay) => ({
    id: pay._id.toString(),
    amount: pay.amount,
    date: pay.date,
    note: pay.note,
    method: pay.method,
    recordedAsIncome: pay.recordedAsIncome,
  })),
  status: p.status,
  createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
  notes: p.notes || '',
});

exports.getProjects = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    const projects = await ClientProject.find({ userId: user._id }).sort({ updatedAt: -1 });

    res.json({
      success: true,
      projects: projects.map(formatProject),
    });
  } catch (error) {
    console.error('Error fetching client projects:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createProject = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    const { clientName, projectTitle, totalValue, notes, initialPayment = 0, addToIncome = true, paymentDate } = req.body;

    if (!clientName || !clientName.trim()) {
      return res.status(400).json({ success: false, message: 'Client name is required' });
    }

    const val = Number(totalValue) || 0;
    if (val <= 0) {
      return res.status(400).json({ success: false, message: 'Deal value must be greater than 0' });
    }

    const initPay = Number(initialPayment) || 0;
    const payments = [];
    const payDateStr = paymentDate && !isNaN(new Date(paymentDate).getTime())
      ? new Date(paymentDate).toISOString()
      : new Date().toISOString();

    if (initPay > 0) {
      payments.push({
        amount: initPay,
        date: payDateStr,
        note: 'Advance payment',
        method: 'UPI',
        recordedAsIncome: Boolean(addToIncome),
      });
    }

    const status = initPay >= val ? 'completed' : initPay > 0 ? 'payment_pending' : 'in_progress';

    const project = await ClientProject.create({
      userId: user._id,
      clientName: clientName.trim(),
      projectTitle: (projectTitle && projectTitle.trim()) || `${clientName.trim()} Website Project`,
      totalValue: val,
      payments,
      status,
      notes: (notes && notes.trim()) || '',
      createdAt: paymentDate && !isNaN(new Date(paymentDate).getTime()) ? new Date(paymentDate) : new Date(),
    });

    res.status(201).json({
      success: true,
      project: formatProject(project),
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addPayment = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    const { id } = req.params;
    const { amount, note, method = 'UPI', addToIncome = true, paymentDate } = req.body;

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required' });
    }

    const project = await ClientProject.findOne({ _id: id, userId: user._id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const dateStr = paymentDate && !isNaN(new Date(paymentDate).getTime())
      ? new Date(paymentDate).toISOString()
      : new Date().toISOString();
    project.payments.unshift({
      amount: payAmount,
      date: dateStr,
      note: (note && note.trim()) || `${method} Payment`,
      method,
      recordedAsIncome: Boolean(addToIncome),
    });

    const totalPaid = project.payments.reduce((sum, p) => sum + p.amount, 0);
    project.status = totalPaid >= project.totalValue ? 'completed' : 'payment_pending';

    await project.save();

    res.json({
      success: true,
      project: formatProject(project),
    });
  } catch (error) {
    console.error('Error adding project payment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    const { id } = req.params;

    const project = await ClientProject.findOneAndDelete({ _id: id, userId: user._id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    const { id } = req.params;
    const { clientName, projectTitle, totalValue, notes, createdAt } = req.body;

    const project = await ClientProject.findOne({ _id: id, userId: user._id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (clientName && clientName.trim()) project.clientName = clientName.trim();
    if (projectTitle && projectTitle.trim()) project.projectTitle = projectTitle.trim();
    if (totalValue !== undefined) {
      const val = Number(totalValue);
      if (val > 0) project.totalValue = val;
    }
    if (notes !== undefined) project.notes = notes.trim();
    if (createdAt) {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) project.createdAt = d;
    }

    const totalPaid = (project.payments || []).reduce((sum, p) => sum + p.amount, 0);
    project.status = totalPaid >= project.totalValue ? 'completed' : totalPaid > 0 ? 'payment_pending' : 'in_progress';

    await project.save();

    res.json({
      success: true,
      project: formatProject(project),
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    const { id, paymentId } = req.params;
    const { amount, note, method, recordedAsIncome, date } = req.body;

    const project = await ClientProject.findOne({ _id: id, userId: user._id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const payment = (project.payments || []).find(
      (p) => p._id.toString() === paymentId || p.id === paymentId
    );
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment milestone not found' });
    }

    if (amount !== undefined) {
      const val = Number(amount);
      if (val > 0) payment.amount = val;
    }
    if (note !== undefined) payment.note = note.trim();
    if (method !== undefined) payment.method = method;
    if (recordedAsIncome !== undefined) payment.recordedAsIncome = Boolean(recordedAsIncome);
    if (date !== undefined) payment.date = date;

    const totalPaid = project.payments.reduce((sum, p) => sum + p.amount, 0);
    project.status = totalPaid >= project.totalValue ? 'completed' : totalPaid > 0 ? 'payment_pending' : 'in_progress';

    await project.save();

    res.json({
      success: true,
      project: formatProject(project),
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const user = await getRequestUser(req);
    const { id, paymentId } = req.params;

    const project = await ClientProject.findOne({ _id: id, userId: user._id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    project.payments = (project.payments || []).filter(
      (p) => p._id.toString() !== paymentId && p.id !== paymentId
    );

    const totalPaid = project.payments.reduce((sum, p) => sum + p.amount, 0);
    project.status = totalPaid >= project.totalValue ? 'completed' : totalPaid > 0 ? 'payment_pending' : 'in_progress';

    await project.save();

    res.json({
      success: true,
      project: formatProject(project),
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

