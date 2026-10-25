// Starter templates for new sections. Once a section is created its columns live in the
// Google Sheet and are edited in the app (Customize), so changing this file only affects
// sections created afterwards. `target` on a link column names another template id; it is
// matched to the section created from that template.
(function () {
  'use strict';
  const o = (value, label, color, extra) => Object.assign({ value, label, color }, extra || {});
  const title = (label) => ({ key: 'title', label, type: 'text', required: true, system: true, onCard: true });

  window.TEMPLATES = [
    {
      id: 'rfq',
      name: 'RFQ & Tender',
      blurb: 'Enquiries from receipt to award, with closing dates and CP & TP stages.',
      stageField: 'stage',
      fields: [
        title('Title / scope'),
        { key: 'rfqNo', label: 'RFQ / tender no.', type: 'text', required: true, onCard: true },
        { key: 'client', label: 'Client', type: 'text', onCard: true },
        { key: 'category', label: 'Category', type: 'select', onCard: true, options: [o('supply', 'Supply', 'gray'), o('projsvc', 'Project/Service', 'blue')] },
        { key: 'stage', label: 'Stage', type: 'select', options: [
          o('todo', 'To Do', 'gray', { alertDays: 1 }),
          o('pending', 'Pending', 'amber', { alertDays: 2 }),
          o('complete', 'Complete', 'blue'),
          o('draft_cptp', 'Draft CP & TP', 'purple'),
          o('cptp_rejected', 'CP & TP Rejected', 'red'),
          o('cptp_approved', 'Approved CP & TP', 'green'),
          o('early_sub', 'Early Submission', 'teal', { done: true }),
          o('submitted', 'Tender Submitted', 'teal', { done: true }),
          o('tc', 'Technical Clarification', 'amber', { done: true }),
          o('tc_submitted', 'TC Submitted', 'teal', { done: true }),
          o('closed', 'Closed by Management', 'gray', { done: true }),
        ] },
        { key: 'closingDate', label: 'Closing date & time', type: 'datetime', due: true, onCard: true },
        { key: 'estValue', label: 'Estimated value', type: 'currency', total: true, onCard: true },
        { key: 'outcome', label: 'Outcome', type: 'select', options: [o('pending', 'Pending', 'gray'), o('awarded', 'Awarded', 'green'), o('lost', 'Lost', 'red'), o('cancelled', 'Cancelled', 'gray')] },
        { key: 'notes', label: 'Notes', type: 'longtext' },
      ],
    },
    {
      id: 'projects',
      name: 'Projects',
      blurb: 'Awarded jobs with contract value, VO, retention, progress and health.',
      stageField: 'status',
      fields: [
        title('Project name'),
        { key: 'code', label: 'Project code', type: 'text', required: true, onCard: true },
        { key: 'client', label: 'Client', type: 'text', onCard: true },
        { key: 'pm', label: 'Project manager', type: 'person', onCard: true },
        { key: 'status', label: 'Status', type: 'select', options: [o('planning', 'Planning', 'gray'), o('active', 'Active', 'blue'), o('onhold', 'On Hold', 'amber'), o('completed', 'Completed', 'green', { done: true })] },
        { key: 'health', label: 'Health', type: 'select', onCard: true, options: [o('ontrack', 'On track', 'green'), o('atrisk', 'At risk', 'amber'), o('offtrack', 'Off track', 'red')] },
        { key: 'contractValue', label: 'Contract value', type: 'currency', total: true, onCard: true },
        { key: 'voValue', label: 'Approved VO', type: 'currency', total: true },
        { key: 'retentionPct', label: 'Retention', type: 'percent' },
        { key: 'progressPct', label: 'Physical progress', type: 'percent', onCard: true },
        { key: 'startDate', label: 'Start date', type: 'date' },
        { key: 'endDate', label: 'Completion date', type: 'date', due: true },
        { key: 'notes', label: 'Notes', type: 'longtext' },
      ],
    },
    {
      id: 'tasks',
      name: 'Project Tasks',
      blurb: 'Tasks and milestones, each linked to a project.',
      stageField: 'status',
      fields: [
        title('Task'),
        { key: 'project', label: 'Project', type: 'link', target: 'projects', onCard: true },
        { key: 'status', label: 'Status', type: 'select', options: [o('todo', 'To Do', 'gray'), o('doing', 'In Progress', 'blue'), o('review', 'Review', 'purple'), o('done', 'Done', 'green', { done: true })] },
        { key: 'priority', label: 'Priority', type: 'select', onCard: true, options: [o('low', 'Low', 'gray'), o('medium', 'Medium', 'blue'), o('high', 'High', 'amber'), o('urgent', 'Urgent', 'red')] },
        { key: 'dueDate', label: 'Due date', type: 'date', due: true, onCard: true },
        { key: 'milestone', label: 'Milestone', type: 'checkbox', onCard: true },
        { key: 'notes', label: 'Notes', type: 'longtext' },
      ],
    },
    {
      id: 'claims',
      name: 'Payment & Claims',
      blurb: 'Progress and VO claims from submission to payment.',
      stageField: 'status',
      fields: [
        title('Description'),
        { key: 'claimNo', label: 'Claim no.', type: 'text', required: true, onCard: true },
        { key: 'project', label: 'Project', type: 'link', target: 'projects', onCard: true },
        { key: 'status', label: 'Status', type: 'select', options: [o('draft', 'Draft', 'gray'), o('submitted', 'Submitted', 'amber'), o('certified', 'Certified', 'blue'), o('invoiced', 'Invoiced', 'purple'), o('paid', 'Paid', 'green', { done: true })] },
        { key: 'submittedDate', label: 'Submitted on', type: 'date' },
        { key: 'claimedAmount', label: 'Claimed', type: 'currency', total: true, onCard: true },
        { key: 'certifiedAmount', label: 'Certified', type: 'currency', total: true },
        { key: 'paidAmount', label: 'Received', type: 'currency', total: true },
        { key: 'paymentDue', label: 'Payment due', type: 'date', due: true, onCard: true },
        { key: 'paidDate', label: 'Received on', type: 'date' },
        { key: 'notes', label: 'Notes', type: 'longtext' },
      ],
    },
  ];

  /** A new section's settings from a template, with link columns pointed at existing sections. */
  window.sectionFromTemplate = function (tpl, sections) {
    const fields = JSON.parse(JSON.stringify(tpl.fields)).map((f) => {
      if (f.type === 'link') {
        const t = sections.find((s) => s.template === f.target && !s.archived);
        f.target = t ? t.id : '';
      }
      return f;
    });
    return { name: tpl.name, template: tpl.id, fields, stageField: tpl.stageField };
  };
})();
