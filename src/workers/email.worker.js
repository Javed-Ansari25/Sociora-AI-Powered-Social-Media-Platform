import { Worker } from 'bullmq';
import { sendEmailOTP, sendForgotPasswordOTP } from '../services/email.service.js';
import redisClient from '../config/redis.js';

const emailWorker = new Worker('email', async (job) => {
    switch (job.name) {
        case 'sendEmailOTP':
        await sendEmailOTP(job.data.email, job.data.otp);
        break;

        case 'sendForgotPasswordOTP':
        await sendForgotPasswordOTP(job.data.email, job.data.otp);
        break;
        
        default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
    },
    {
        connection: redisClient,
        concurrency: 5, // Adjust concurrency as needed
    }
);

emailWorker.on("ready", () => {
  console.log("✅ Email worker connected to Redis");
});
        
emailWorker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
});

emailWorker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed with error: ${err.message}`);
});
