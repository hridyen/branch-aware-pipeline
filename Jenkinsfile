pipeline {
    agent { label 'ubuntu-agent' }

    environment {
        ALLOWED_BRANCHES = "dev,prod"
        IMAGE_NAME = "branch-app"
    }

    triggers {
        githubPush()
    }

    stages {

        stage('Detect Branch') {
            steps {
                script {

                    def branch = ""

                    if (env.ref) {
                        branch = env.ref.replace("refs/heads/", "")
                    } else {
                        branch = "unknown"
                    }

                    env.BRANCH_NAME = branch

                    echo "Branch detected: ${env.BRANCH_NAME}"
                }
            }
        }

        stage('Check Allowed') {
            steps {
                script {
                    def allowed = ALLOWED_BRANCHES.split(",")

                    if (!allowed.contains(env.BRANCH_NAME)) {
                        echo "Skipping: ${env.BRANCH_NAME}"
                        currentBuild.result = 'ABORTED'
                        error("Stopping pipeline")
                    }
                }
            }
        }

        stage('Checkout') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: "*/${env.BRANCH_NAME}"]],
                    userRemoteConfigs: [[
                        url: 'https://github.com/hridyen/branch-aware-pipeline.git'
                    ]]
                ])
            }
        }

        stage('Build Image') {
            steps {
                sh "docker build --no-cache -t ${IMAGE_NAME}:${env.BRANCH_NAME} ."
            }
        }

        stage('Run Container') {
            steps {
                script {

                    def port = env.BRANCH_NAME == "dev" ? "3001" : "3002"

                    sh "docker rm -f ${IMAGE_NAME}-${env.BRANCH_NAME} || true"

                    sh """
                    docker run -d -p ${port}:3000 \
                    --name ${IMAGE_NAME}-${env.BRANCH_NAME} \
                    -e BRANCH=${env.BRANCH_NAME} \
                    ${IMAGE_NAME}:${env.BRANCH_NAME}
                    """
                }
            }
        }
    }
}