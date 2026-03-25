pipeline {
    // Run this pipeline on a specific Jenkins agent (Ubuntu machine with Docker installed)
    agent { label 'ubuntu-agent' }

    environment {
        // Only these branches are allowed to trigger deployment
        ALLOWED_BRANCHES = "dev,prod"

        // Base name for Docker images and containers
        IMAGE_NAME = "branch-app"
    }

    stages {

        // -------------------------------
        // Stage 1: Detect Branch
        // -------------------------------
        stage('Detect Branch') {
            steps {
                script {

                    // Initialize a variable to store branch name
                    def branch = ""

                    // 'ref' comes from GitHub webhook payload (Generic Webhook Trigger)
                    // Example: refs/heads/dev
                    if (env.ref) {
                        // Extract only the branch name (dev, prod, etc.)
                        branch = env.ref.replace("refs/heads/", "")
                    } else {
                        // Fallback in case pipeline is triggered manually
                        branch = "unknown"
                    }

                    // Store branch name globally for use in later stages
                    env.BRANCH_NAME = branch

                    // Log for debugging
                    echo "Branch detected: ${env.BRANCH_NAME}"
                }
            }
        }

        // -------------------------------
        // Stage 2: Check Allowed Branches
        // -------------------------------
        stage('Check Allowed') {
            steps {
                script {

                    // Convert allowed branches string into a list
                    def allowed = ALLOWED_BRANCHES.split(",")

                    // If current branch is not in allowed list, stop pipeline
                    if (!allowed.contains(env.BRANCH_NAME)) {
                        echo "Skipping: ${env.BRANCH_NAME}"

                        // Mark build as intentionally stopped (not failed)
                        currentBuild.result = 'ABORTED'

                        // Stop execution
                        error("Stopping pipeline")
                    }

                    echo "Allowed branch: ${env.BRANCH_NAME}"
                }
            }
        }

        // -------------------------------
        // Stage 3: Checkout Code
        // -------------------------------
        stage('Checkout') {
            steps {

                // Dynamically checkout the correct branch from GitHub
                checkout([
                    $class: 'GitSCM',

                    // Select branch based on detected branch name
                    branches: [[name: "*/${env.BRANCH_NAME}"]],

                    // GitHub repository URL
                    userRemoteConfigs: [[
                        url: 'https://github.com/hridyen/branch-aware-pipeline.git'
                    ]]
                ])
            }
        }

        // -------------------------------
        // Stage 4: Build Docker Image
        // -------------------------------
        stage('Build Image') {
            steps {

                // Build Docker image using Dockerfile in workspace
                // --no-cache ensures fresh build every time (avoids stale layers)
                // Tag format: branch-app:dev or branch-app:prod
                sh "docker build --no-cache -t ${IMAGE_NAME}:${env.BRANCH_NAME} ."
            }
        }

        // -------------------------------
        // Stage 5: Run Container
        // -------------------------------
        stage('Run Container') {
            steps {
                script {

                    // Assign different ports for different environments
                    // This allows multiple environments to run on same machine
                    def port = env.BRANCH_NAME == "dev" ? "3001" : "3002"

                    // Remove existing container (if any) to avoid conflicts
                    // '|| true' prevents failure if container does not exist
                    sh "docker rm -f ${IMAGE_NAME}-${env.BRANCH_NAME} || true"

                    // Run a new container from the built image
                    sh """
                    docker run -d -p ${port}:3000 \
                    --name ${IMAGE_NAME}-${env.BRANCH_NAME} \
                    -e BRANCH=${env.BRANCH_NAME} \
                    ${IMAGE_NAME}:${env.BRANCH_NAME}
                    """

                    // Log deployed environment and port
                    echo "Application deployed for ${env.BRANCH_NAME} on port ${port}"
                }
            }
        }
    }
}
