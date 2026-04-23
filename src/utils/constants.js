export const STORAGE_KEY = 'klassplacering_v2_data';

export const ALGORITHM_CONSTANTS = {
  OPTIMIZATION_ITERATIONS: 3000,
  HARD_CONSTRAINT_PENALTY: 5000,
  SOLO_PENALTY: 5000,
  ISOLATION_PENALTY: 500,
  HISTORY_PENALTY: 50,
  ROW_PENALTY_MULTIPLIER: 20,
  ACCEPTANCE_PROBABILITY: 0.05
};

export const DESIGN_BRUSH_TYPES = {
  SINGLE: 'single',
  PAIR: 'pair',
  TRIPLE: 'triple',
  GROUP_4: 'group4',
  GROUP_5: 'group5',
  GROUP_6: 'group6',
  ERASER: 'eraser'
};

export const CONSTRAINT_TYPES = {
  AVOID: 'avoid',
  PAIR: 'pair'
};

export const TAB_IDS = {
  STUDENTS: 'students',
  CONSTRAINTS: 'constraints',
  LAYOUT: 'layout',
  HISTORY: 'history'
};