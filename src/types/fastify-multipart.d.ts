declare module '@fastify/multipart' {
  import { FastifyPluginAsync } from 'fastify';

  interface MultipartLimits {
    fieldNameSize?: number;
    fieldSize?: number;
    fields?: number;
    fileSize?: number;
    files?: number;
    headerPairs?: number;
  }

  interface FastifyMultipartOptions {
    limits?: MultipartLimits;
    attachFieldsToBody?: boolean | 'keyValues';
  }

  const fastifyMultipart: FastifyPluginAsync<FastifyMultipartOptions>;
  export default fastifyMultipart;
}
