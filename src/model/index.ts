// The available house models.
import type { HouseModel } from './types';
import { VILLA } from './villa';

export const MODELS: Record<string, HouseModel> = { villa: VILLA };
export const modelFor = (id?: string): HouseModel => MODELS[id ?? 'villa'] ?? VILLA;
