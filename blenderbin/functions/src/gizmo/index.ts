import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { OpenAI } from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const generateBlenderCode = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const { prompt } = data;
  if (!prompt) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function requires a "prompt" argument.'
    );
  }

  try {
    // Get user data to check subscription status
    const userSnapshot = await admin
      .firestore()
      .collection('users')
      .doc(context.auth.uid)
      .get();
    
    const userData = userSnapshot.data();
    const isPaidUser = userData?.stripeRole === 'pro' || userData?.stripeRole === 'team';

    // Check usage limits for free tier users
    if (!isPaidUser) {
      const usageSnapshot = await admin
        .firestore()
        .collection('usage')
        .doc(context.auth.uid)
        .get();
      
      const usageData = usageSnapshot.data() || { count: 0, lastReset: new Date(0) };
      
      // Check if user is within free tier limits (5 generations per month)
      if (usageData.count >= 5) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'Free tier limit reached. Please upgrade to continue using Gizmo AI.'
        );
      }
      
      // Update usage count
      await admin
        .firestore()
        .collection('usage')
        .doc(context.auth.uid)
        .set({
          count: usageData.count + 1,
          lastReset: usageData.lastReset,
          lastUsed: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }

    // Generate Python code with OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a Blender Python API expert. Generate Python code that can be directly executed in Blender to achieve the user's request. 
                    Include necessary imports and follow best practices for Blender Python scripting. 
                    The code should be clean, efficient, and well-commented. 
                    Only output the Python code with no additional text or explanations.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
    });

    const generatedCode = response.choices[0].message.content;

    // Record the generation in the database
    await admin.firestore().collection('gizmo_generations').add({
      userId: context.auth.uid,
      prompt,
      generatedCode,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { code: generatedCode };
  } catch (error: any) {
    console.error('Error generating code:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to generate code'
    );
  }
});

// Function to execute generated code in Blender (this would be called from the Blender plugin)
export const recordCodeExecution = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const { generationId, success, errorMessage } = data;
  
  if (!generationId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function requires a "generationId" argument.'
    );
  }

  try {
    // Record execution results
    await admin.firestore().collection('code_executions').add({
      userId: context.auth.uid,
      generationId,
      success: Boolean(success),
      errorMessage: errorMessage || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error recording execution:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to record code execution'
    );
  }
});

// Function to retrieve user's generation history
export const getGenerationHistory = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  try {
    const generationsSnapshot = await admin
      .firestore()
      .collection('gizmo_generations')
      .where('userId', '==', context.auth.uid)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    
    const generations = generationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { generations };
  } catch (error: any) {
    console.error('Error fetching generation history:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to fetch generation history'
    );
  }
}); 