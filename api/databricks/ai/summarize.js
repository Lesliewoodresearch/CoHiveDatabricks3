/**
 * Databricks AI Summary Generation API
 * 
 * Generates markdown summaries from Findings data using Databricks AI.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      brand,
      projectType,
      fileName,
      selectedFiles,
      outputOptions,
      hexExecutions,
      completedSteps,
      responses,
      
      // User info
      userEmail,
      userRole,
      
      // Auth
      accessToken,
      workspaceHost,
      
      // Model settings
      modelEndpoint = 'databricks-claude-sonnet-4-6',
    } = req.body;

    if (!brand || !projectType || !userEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['brand', 'projectType', 'userEmail']
      });
    }

    if (!accessToken || !workspaceHost) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log(`[AI Summary] Generating summary for ${brand} - ${projectType}`);
    console.log(`[AI Summary] Selected files: ${selectedFiles?.length || 0}`);
    console.log(`[AI Summary] Output options: ${outputOptions?.join(', ') || 'none'}`);
    console.log(`[AI Summary] Completed steps: ${completedSteps?.join(', ') || 'none'}`);

    // Build the summary prompt
    const systemPrompt = `You are an expert marketing strategist and analyst. Your task is to create comprehensive, well-structured markdown summaries of marketing campaign findings and insights.

Your summaries should:
- Be clear, concise, and actionable
- Use proper markdown formatting (headers, lists, bold, italic, tables, etc.)
- Include relevant data and insights from the provided information
- Organize information logically with clear sections
- Highlight key findings and recommendations
- Be professional and suitable for executive presentation`;

    // Build the user prompt with all context
    let userPrompt = `Generate a comprehensive markdown summary for the following marketing project:

**Brand:** ${brand}
**Project Type:** ${projectType}
**Summary File:** ${fileName}

`;

    // Add output options context
    if (outputOptions && outputOptions.length > 0) {
      userPrompt += `\n**Requested Output Elements:**\n`;
      outputOptions.forEach(option => {
        userPrompt += `- ${option}\n`;
      });
    }

    // Add completed workflow steps
    if (completedSteps && completedSteps.length > 0) {
      userPrompt += `\n**Workflow Steps Completed:**\n`;
      completedSteps.forEach(step => {
        userPrompt += `- ${step}\n`;
      });
    }

    // Add hex execution results
    if (hexExecutions && Object.keys(hexExecutions).length > 0) {
      userPrompt += `\n**Hex Execution Results:**\n\n`;
      
      for (const [hexId, executions] of Object.entries(hexExecutions)) {
        if (executions && executions.length > 0) {
          userPrompt += `### ${hexId}\n`;
          userPrompt += `Total executions: ${executions.length}\n\n`;
          
          // Include most recent execution details
          const latestExecution = executions[executions.length - 1];
          if (latestExecution.selectedFiles) {
            userPrompt += `**Selected Files:** ${latestExecution.selectedFiles.join(', ')}\n`;
          }
          if (latestExecution.assessmentType) {
            const types = Array.isArray(latestExecution.assessmentType) 
              ? latestExecution.assessmentType 
              : [latestExecution.assessmentType];
            userPrompt += `**Assessment Type:** ${types.join(', ')}\n`;
          }
          if (latestExecution.assessment) {
            userPrompt += `**Assessment:** ${latestExecution.assessment}\n`;
          }
          userPrompt += `\n`;
        }
      }
    }

    // Add Enter hex responses (brand/project details)
    if (responses && responses.Enter) {
      userPrompt += `\n**Project Details:**\n`;
      const enterResponses = responses.Enter;
      if (enterResponses[0]) userPrompt += `- Brand: ${enterResponses[0]}\n`;
      if (enterResponses[1]) userPrompt += `- Project Type: ${enterResponses[1]}\n`;
      if (enterResponses[2]) userPrompt += `- Project File: ${enterResponses[2]}\n`;
    }

    userPrompt += `\n---\n\nBased on the above information, create a comprehensive markdown summary that includes:

1. **Executive Summary** - High-level overview of the project and key findings
2. **Project Overview** - Details about the brand, project type, and scope
3. **Methodology** - Which workflow steps were completed and what analysis was performed
4. **Key Findings** - Main insights and discoveries from each hex execution
5. **Recommendations** - Actionable next steps and strategic recommendations
6. **Supporting Data** - Relevant metrics, file references, and detailed analysis

`;

    // Add specific sections based on output options
    if (outputOptions?.includes('Executive Summary')) {
      userPrompt += `- Include a detailed executive summary at the beginning\n`;
    }
    if (outputOptions?.includes('Share all Ideas as a list')) {
      userPrompt += `- Create a comprehensive list of all ideas generated\n`;
    }
    if (outputOptions?.includes('Provide a grid with all "final" ideas with their scores')) {
      userPrompt += `- Include a markdown table showing all final ideas with scores\n`;
    }
    if (outputOptions?.includes('Include Gems')) {
      userPrompt += `- Highlight particularly valuable insights (gems) throughout\n`;
    }
    if (outputOptions?.includes('Include User Notes from all iterations as an Appendix')) {
      userPrompt += `- Add an appendix section with detailed notes from all iterations\n`;
    }

    userPrompt += `\nFormat the entire summary in clean, well-structured markdown. Use headers, bullet points, numbered lists, tables, bold/italic text, and other markdown elements to make the summary easy to read and professional.`;

    // Call Databricks Model Serving endpoint
    const messages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    const modelPayload = {
      model: modelEndpoint,
      messages: messages,
      max_tokens: 4000, // Allow longer summaries
      temperature: 0.7,
    };

    console.log(`[AI Summary] Calling model endpoint: ${modelEndpoint}`);

    const modelResponse = await fetch(
      `https://${workspaceHost}/serving-endpoints/${modelEndpoint}/invocations`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modelPayload),
      }
    );

    if (!modelResponse.ok) {
      const errorData = await modelResponse.json().catch(() => ({}));
      console.error('[AI Summary] Model invocation failed:', errorData);
      throw new Error(`Model invocation failed: ${errorData.message || modelResponse.statusText}`);
    }

    const modelResult = await modelResponse.json();

    // Extract the response
    let markdownSummary = '';
    let usage = {};

    if (modelResult.choices && modelResult.choices.length > 0) {
      markdownSummary = modelResult.choices[0].message?.content || modelResult.choices[0].text || '';
      usage = modelResult.usage || {};
    } else if (modelResult.predictions && modelResult.predictions.length > 0) {
      markdownSummary = modelResult.predictions[0];
    } else {
      throw new Error('Unexpected model response format');
    }

    console.log(`[AI Summary] SUCCESS - Generated ${markdownSummary.length} characters`);
    console.log(`[AI Summary] Usage: ${JSON.stringify(usage)}`);

    return res.status(200).json({
      success: true,
      summary: markdownSummary,
      model: modelEndpoint,
      usage: {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
      },
      metadata: {
        brand,
        projectType,
        fileName,
        completedSteps: completedSteps?.length || 0,
        hexExecutions: Object.keys(hexExecutions || {}).length,
      },
    });

  } catch (error) {
    console.error('[AI Summary] Error:', error);
    return res.status(500).json({ 
      error: 'Summary generation failed',
      message: error.message 
    });
  }
}
