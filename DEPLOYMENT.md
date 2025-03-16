# Deployment Guide

This document provides step-by-step instructions for deploying the Project Manager application to GitHub and Netlify.

## Prerequisites

Before starting the deployment process, ensure you have:

1. Created accounts on:
   - [GitHub](https://github.com/)
   - [Netlify](https://www.netlify.com/)

2. Obtained API keys from:
   - [OpenAI](https://platform.openai.com/account/api-keys)
   - [Deepgram](https://console.deepgram.com/)
   - [Google AI](https://ai.google.dev/) (optional, for enhanced features)

## Step 1: Fix the API Key Issues

1. Open the `.env.local` file in the project root directory.
2. Replace the placeholder values with your actual API keys:

```
VITE_OPENAI_API_KEY=your_actual_openai_key_here
VITE_DEEPGRAM_API_KEY=your_actual_deepgram_key_here
VITE_GOOGLE_AI_API_KEY=your_actual_google_ai_key_here
```

3. Save the file.

## Step 2: Deploy to GitHub

1. Create a new repository on GitHub.
2. Initialize the local repository and push it to GitHub:

```bash
# Navigate to the project directory
cd /Users/mattysquarzoni/PRJCT_MGR\ copy\ 2

# Initialize Git repository
git init

# Add all files to Git
git add .

# Commit the changes
git commit -m "Initial commit"

# Set the main branch
git branch -M main

# Add the remote repository (replace 'yourusername' with your actual GitHub username)
git remote add origin https://github.com/yourusername/project-manager.git

# Push to GitHub
git push -u origin main
```

## Step 3: Deploy to Netlify

1. Log in to [Netlify](https://app.netlify.com/).
2. Click on "New site from Git".
3. Select GitHub as the continuous deployment provider.
4. Authorize Netlify to access your GitHub repositories if prompted.
5. Select the repository you just created.
6. Configure the deployment settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
7. Click on "Show advanced" and add the following environment variables:
   - `VITE_OPENAI_API_KEY`: Your OpenAI API key
   - `VITE_DEEPGRAM_API_KEY`: Your Deepgram API key
   - `VITE_GOOGLE_AI_API_KEY`: Your Google AI API key
8. Click on "Deploy site".

## Step 4: Verify the Deployment

1. Wait for the deployment to complete.
2. Click on the generated Netlify URL to access your deployed application.
3. Test the application to ensure all features are working as expected.
4. If you encounter any issues:
   - Check the Netlify deployment logs
   - Verify that your environment variables are correctly set
   - Ensure that the API keys have the necessary permissions

## Step 5: Set Up a Custom Domain (Optional)

1. In the Netlify dashboard, go to your site settings.
2. Click on "Domain management" > "Add custom domain".
3. Follow the instructions to configure your custom domain.

## Continuous Deployment

Once your site is deployed, any changes pushed to the main branch of your GitHub repository will automatically trigger a new deployment on Netlify.

## Troubleshooting

If you encounter any issues with the deployment:

1. **API Key Issues**:
   - Verify that your API keys are valid and have the necessary permissions.
   - Check the browser console for any API-related errors.

2. **Build Failures**:
   - Review the build logs in Netlify to identify any compilation or dependency issues.
   - Ensure that all required dependencies are properly installed.

3. **Runtime Errors**:
   - Use the browser's developer tools to check for any JavaScript errors.
   - Verify that environment variables are correctly accessed in the code.

4. **Performance Issues**:
   - Consider using a content delivery network (CDN) for improved performance.
   - Optimize images and assets for faster loading times. 