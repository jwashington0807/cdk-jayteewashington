This is a guide to the website that I am creating using AWS Serverless Architecture with AngularJS frontend development

There are 2 repositories. The angular project has been cloned into the cdk project.

- pipeline setup
1. Gets input from the command line. REQUIRED to specify and environment name via "env". If not supplied, error is thrown.
2. Takes the "env" parameter and pulls context values construted from the cdk.json project file of pipeline

- pipeline stack
1. Deconstructs the props passed by the pipeline initialization to be used in creation of AWS Constructs
2. In order to communicate with GitHub repos, added a new GitHub token via AWS Secret Store
3. Creating 2 S3 Buckets
    a. Artifacts S3 to hold data from the Pipelining flow
    b. Angular S3 bucket to hold dist files used for hosting website
4. Configure domain to be used. Domain name has been registered via AWS Route 53
5. Create SSL Certificate to be used with domain. All requests will go through HTTPS
6. Initializes new CloudFront Distribution that will be given READ access to S3. (NOTE: Access set to BLOCK ALL for S3 buckets)
7. Create a new A Record for Domain
8. Creation of Pipeline Projects
    1a. Angular Pipeline Project (S3 Deployment via CodeBuild)
    2a. Infrastructure Pipeline Project (CloudFormation via CodeBuild)

- 1a. Angular
1. Separate Git Repo, cloned into CDK project
2. CodeBuild will use ng commands to build project into the "dist" folder. 
3. Caches the node_modules folder so that it won't have to be loaded every build. build time = $$$


- 2a. Infrastructure
1. Creates the Cloud Formation template using "cdk deploy" and passing in context parameter

- Pipeline
1. Creates new Pipeline
2. Sets up the stages of the Pipeline
    1a. Source
        1aa. Auth with Github. Pulls out both repos by branch and name. (Configured in cdk.json)
        1bb. Needs to build front end application. Build stage (CodeBuild)
        1cc. Deploys files from angular build to S3 Bucket
        1dd. Creates formation stack (CodeBuild)
