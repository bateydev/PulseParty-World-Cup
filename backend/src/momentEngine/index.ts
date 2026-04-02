/**
 * Moment Engine Module
 * Generates prediction windows based on match events or time intervals
 */

export {
  generatePredictionWindow,
  generateTimeBasedPredictionWindow,
  shouldTriggerPrediction,
  getRemainingTime,
  isWindowExpired,
  TRIGGER_EVENT_TYPES,
  TIME_BASED_INTERVAL_MS,
  DEFAULT_WINDOW_DURATION_SECONDS,
} from './predictionWindowGenerator';

export {
  storePredictionWindow,
  broadcastPredictionWindow,
  storeAndBroadcastPredictionWindow,
} from './predictionWindowStorage';

export {
  submitPrediction,
  getSubmissionCount,
  broadcastSubmissionCount,
  hasUserSubmitted,
  getPredictionsForWindow,
} from './predictionSubmission';

export {
  evaluatePredictions,
  closePredictionWindow,
  evaluatePredictionsForWindow,
  determineOutcome,
  broadcastEvaluationResults,
} from './predictionEvaluation';
