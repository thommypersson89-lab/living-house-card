// The available house models.
import { RANCH } from './ranch';
import { TOWNHOUSE } from './townhouse';
import type { HouseModel } from './types';
import { VILLA } from './villa';

export const MODELS: Record<string, HouseModel> = { villa: VILLA, ranch: RANCH, townhouse: TOWNHOUSE };
export const modelFor = (id?: string): HouseModel => MODELS[id ?? 'villa'] ?? VILLA;
