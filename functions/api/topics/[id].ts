/** GET /api/topics/:id: public canonical-topic metadata. */
import { topicResponse, TopicContext } from './topicEndpoint.js';
interface Context extends TopicContext { params: { id?: string }; }
export function onRequestGet(context: Context): Promise<Response> { return topicResponse(context, { resource: 'detail', rawTopic: context.params.id }); }
