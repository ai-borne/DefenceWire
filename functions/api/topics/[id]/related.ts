/** GET /api/topics/:id/related: published topic navigation relations. */
import { topicResponse, TopicContext } from '../topicEndpoint.js';
interface Context extends TopicContext { params: { id?: string }; }
export function onRequestGet(context: Context): Promise<Response> { return topicResponse(context, { resource: 'related', rawTopic: context.params.id }); }
