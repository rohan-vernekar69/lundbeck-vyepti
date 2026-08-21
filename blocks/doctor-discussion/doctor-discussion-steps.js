import { TOTAL_STEPS_DEFAULT } from './doctor-discussion-utils.js';

// ---------------------------------------------------------------------------
// Default step data
// ---------------------------------------------------------------------------

// Fallback content used when the block is placed on a page with no authored table rows.
export const DEFAULT_STEPS = [

  // Step 1
  {
    title: 'Start your Doctor Discussion Guide',
    fields: [
      { type: 'text', name: 'dg-name', label: 'My name is', helper: 'Optional', required: false },
      {
        type: 'checkbox',
        name: 'dg-activities',
        label: 'What types of activities or events are impacted by migraine?',
        helper: 'Select all that apply',
        description: "This might include events or activities you miss because of migraine or times that you participate but don't feel like yourself because of migraine.",
        options: [
          { text: 'Social events with friends/family' },
          { text: 'Work/school' },
          { text: 'Daily life/household activities' },
          { text: 'Exercise or being active' },
          { text: "I can't make plans" },
          { text: 'None of the above' },
        ],
        required: true,
      },
    ],
    didYouKnow: {
      heading: 'DID YOU KNOW?',
      text: 'For more than 90% of those affected, migraine interferes with education, career, or social activities.',
    },
  },

  // Step 2
  {
    title: 'How does living with migraine make you feel?',
    fields: [
      {
        type: 'checkbox',
        name: 'dg-feelings',
        label: '',
        helper: 'Select all that apply',
        description: '',
        options: [
          { text: 'Defeated' },
          { text: 'Frustrated' },
          { text: 'On edge' },
          { text: 'Stuck' },
          { text: 'Desperate' },
          { text: 'Isolated' },
          { text: 'Not my best' },
          { text: 'None of the above' },
        ],
        required: true,
      },
    ],
    didYouKnow: {
      heading: 'DID YOU KNOW?',
      text: 'Patients with migraine are at least 3 times more likely to suffer from insomnia, depression, or anxiety than those without migraine. Migraine sufferers also may have increased feelings of isolation.',
    },
  },

  // Step 3
  {
    title: 'How many days a month are "crystal clear" and not impacted by migraine in any way?',
    fields: [
      {
        type: 'radio',
        name: 'dg-clear-days',
        label: '',
        helper: 'Select one',
        description: '',
        options: [
          { text: '0–5 days a month' },
          { text: '6–10 days a month' },
          { text: '11–15 days a month' },
          { text: '16–20 days a month' },
          { text: '21+ days a month' },
        ],
        required: true,
      },
    ],
    didYouKnow: {
      heading: 'DID YOU KNOW?',
      text: '77% of people in a survey of 1,100 people with migraine (who also had a mental health condition) worried about the stigma of migraine and mental health. '
        + 'In fact, many were hesitant to discuss the issue with their doctor.',
    },
  },

  // Step 4
  {
    title: 'In the last 3 months, have you been having more migraine attacks?',
    fields: [
      {
        type: 'radio',
        name: 'dg-more-attacks',
        label: '',
        helper: 'Select one',
        description: '',
        options: [
          { text: 'Yes' },
          { text: 'No' },
          { text: 'Not sure' },
        ],
        required: true,
      },
    ],
  },

  // Step 5
  {
    title: 'In the last 3 months, have you been taking more medication to stop migraine attacks?',
    fields: [
      {
        type: 'radio',
        name: 'dg-more-medication',
        label: '',
        helper: 'Select one',
        description: '',
        options: [
          { text: 'Yes' },
          { text: 'No' },
          { text: 'Not sure' },
        ],
        required: true,
      },
    ],
    didYouKnow: {
      heading: 'DID YOU KNOW?',
      text: 'In one study, over 70% of patients reported that using a migraine diary helped communication with their doctor and increased their level of satisfaction with migraine treatment.',
    },
  },

  // Step 6
  {
    title: 'In the last 3 months, how have you tried to address migraine?',
    fields: [
      {
        type: 'checkbox',
        name: 'dg-treatments-tried',
        label: '',
        helper: 'Select all that apply',
        description: '',
        options: [
          { text: 'Over-the-counter relief medication' },
          { text: 'Prescription relief medication' },
          { text: 'Preventive treatment medication' },
          { text: 'Medical devices' },
          { text: 'Changes in lifestyle, diet, or exercise' },
          { text: 'None of the above' },
        ],
        required: true,
      },
    ],
    didYouKnow: {
      heading: 'DID YOU KNOW?',
      text: 'Migraine impacts 39 million people in the US, and one study showed that 97% take medication for relief.',
    },
  },

  // Step 7
  {
    title: 'Are you satisfied with your current preventive treatment?',
    fields: [
      {
        type: 'radio',
        name: 'dg-preventive-satisfaction',
        label: '',
        helper: 'Select one',
        description: '',
        options: [
          { text: 'Yes' },
          { text: 'No' },
          { text: 'Not sure' },
          { text: 'Not currently on a preventive treatment' },
        ],
        required: true,
      },
    ],
  },

  // Step 8
  {
    title: 'What are you hoping to find in a preventive migraine treatment?',
    fields: [
      {
        type: 'checkbox',
        name: 'dg-preventive-goals',
        label: '',
        helper: 'Select all that apply',
        description: '',
        options: [
          { text: 'Gives me more migraine-free days' },
          { text: 'Works fast and lasts between scheduled doses' },
          { text: 'Reduces the use of rescue medications' },
          { text: 'Provides results with fewer doses' },
          { text: 'None of the above' },
        ],
        required: true,
      },
    ],
  },

  // Step 9
  {
    title: 'Are you open to trying an IV infusion treatment given 4x/year to help prevent migraine attacks?',
    fields: [
      {
        type: 'radio',
        name: 'dg-iv-infusion',
        label: '',
        helper: 'Select one',
        description: '',
        options: [
          { text: 'Yes' },
          { text: 'No' },
          { text: 'Not sure' },
        ],
        required: true,
      },
    ],
    didYouKnow: {
      heading: 'DID YOU KNOW?',
      text: 'An IV infusion delivers 100% of the medication into your bloodstream, which means it is available to start working right away.',
    },
  },

];


// ---------------------------------------------------------------------------
// Authored-table parser
// ---------------------------------------------------------------------------


// Splits an authored comma-separated options cell into individual option objects.
export function parseOptions(raw) {
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => ({ text: entry }));
}

// Row-type keys with dedicated parsing below. Any row whose key isn't in
// this set is treated as Thank You content (see below) — regardless of
// what the author typed as its label, and regardless of where in the
// table it sits.
const KNOWN_ROW_KEYS = new Set([
  'step-title', 'step-number', 'total-steps',
  'did-you-know', 'text-question', 'checkbox-question', 'radio-question',
]);

// Reads the authored EDS table rows and converts them into the steps/fields
// data structure the UI renders from, plus the authored Thank You content
// (see buildThankYouModal() in doctor-discussion-interactions.js for how
// it's consumed).
export function parseSteps(block) {
  const rows = [...block.children];
  const steps = [];
  // Live DOM nodes making up the Thank You content, accumulated (in table
  // order) from every row that isn't one of the known step/question types
  // — see below. Moved into the Thank You modal later (see decorate.js /
  // buildThankYouModal()).
  const thankYouContent = [];

  // Mutable parse state, threaded through the per-row-type handlers below
  // instead of being reassigned inline in a switch statement.
  const state = { current: null, fieldIndex: 0, totalSteps: TOTAL_STEPS_DEFAULT };

  // Ensures there's a step to attach fields/callouts to, creating an
  // untitled one if the author placed a question/callout row before any
  // step-title row.
  function ensureCurrentStep() {
    if (!state.current) {
      state.current = { title: '', fields: [] };
      steps.push(state.current);
    }
    return state.current;
  }

  function handleStepTitle(rest) {
    state.current = { title: rest[0] || '', fields: [] };
    steps.push(state.current);
    state.fieldIndex = 0;
  }

  function handleTotalSteps(rest) {
    state.totalSteps = Number(rest[0]) || state.totalSteps;
  }

  function handleDidYouKnow(rest) {
    const current = ensureCurrentStep();
    // rest[0] (icon column) is intentionally ignored — the callout
    // icon is supplied entirely by CSS against `.dg-callout-icon` now.
    current.didYouKnow = {
      heading: rest[1] || 'DID YOU KNOW?',
      text: rest[2] || '',
    };
  }

  function handleTextQuestion(rest) {
    const current = ensureCurrentStep();
    current.fields.push({
      type: 'text',
      name: `dg-text-${steps.length}-${state.fieldIndex}`,
      label: rest[0] || '',
      helper: rest[1] ?? '',
      required: false,
    });
    state.fieldIndex += 1;
  }

  function handleCheckboxQuestion(rest) {
    const current = ensureCurrentStep();
    current.fields.push({
      type: 'checkbox',
      name: `dg-checkbox-${steps.length}-${state.fieldIndex}`,
      label: rest[0] || '',
      helper: rest[1] ?? '',
      description: rest[2] ?? '',
      options: rest[3] ? parseOptions(rest[3]) : [],
      required: true,
    });
    state.fieldIndex += 1;
  }

  function handleRadioQuestion(rest) {
    const current = ensureCurrentStep();
    current.fields.push({
      type: 'radio',
      name: `dg-radio-${steps.length}-${state.fieldIndex}`,
      label: rest[0] || '',
      helper: rest[1] ?? 'Select one',
      description: rest[2] ?? '',
      options: rest[3] ? parseOptions(rest[3]) : [],
      required: true,
    });
    state.fieldIndex += 1;
  }

  // Dispatch table replacing the old switch statement. A Map (rather than a
  // plain object) is used so looking a row up by its dynamic `key` can't be
  // mistaken for prototype-polluting object injection. Explicit step-number
  // rows are no longer required (steps are numbered by their position), but
  // a no-op handler keeps parsing harmless if authored.
  const rowHandlers = new Map([
    ['step-title', handleStepTitle],
    ['step-number', () => {}],
    ['total-steps', handleTotalSteps],
    ['did-you-know', handleDidYouKnow],
    ['text-question', handleTextQuestion],
    ['checkbox-question', handleCheckboxQuestion],
    ['radio-question', handleRadioQuestion],
  ]);

  rows.forEach((row) => {
    const cells = [...row.children];
    const key = cells[0]?.textContent?.trim().toLowerCase();
    const rest = cells.slice(1).map((c) => c.textContent.trim());

    // Thank You rows are identified by exclusion — any row whose key isn't a
    // recognized step/question type is treated as Thank You content. cells[0]
    // is free-form author notes (unread by the parser); cells[1] from each
    // such row is appended in order to build the combined message.
    if (!KNOWN_ROW_KEYS.has(key)) {
      // cells[1] is the authored rich-content cell (image, heading, copy),
      // captured as live DOM nodes rather than as text so it can be
      // moved as-is into the Thank You modal by buildThankYouModal().
      if (cells[1]) thankYouContent.push(...cells[1].children);
      return;
    }

    rowHandlers.get(key)(rest);
  });

  return { steps, totalSteps: state.totalSteps || steps.length, thankYouContent };
}