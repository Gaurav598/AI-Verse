'use strict';

module.exports = {
  async afterCreate(event) {
    const { result, data } = event;
    const documentId = result.id;
    
    // Add job to BullMQ queue for processing
    try {
      const { queues } = require('../../../../jobs/index');
      if (queues['document-processing']) {
        await queues['document-processing'].add('process-document', {
          documentId,
        });
      }
    } catch (err) {
      console.error('Failed to enqueue document processing job', err);
    }
  },
};
