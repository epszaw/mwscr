import type { PostingService, Service } from '../entities/service.js';
import { email } from './email.js';
import { github } from './github.js';
import { instagram } from './instagram.js';
import { telegram } from './telegram.js';
import { vk } from './vk.js';
import { youtube } from './youtube.js';

export const services: Service[] = [instagram, youtube, vk, telegram, github, email];
export const postingServices: PostingService[] = [instagram, youtube, vk, telegram];
