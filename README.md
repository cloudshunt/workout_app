# Workout App
**Table of contents**
-	[Agenda](#agenda)
-	[Technologies](#technologies)
-	[Pipeline](#pipeline)
-	[Project Reproduction](#project-reproduction)
-	[Future Improvements](#future-improvements)

## Agenda
**This project allows users to:**
- Create personalized workout routines.
- Log workout sessions in real-time.
- Review and reference historical workout records.

## Technologies
-	**Javascript**:
    - Node version: `Node.js v20.18.1`
    - npm(Node Package Manager)

- **OS system**:
  - `Linux Mint 21.2 Cinnamon`

- **Browsers (used for testing)**:
    - Brave
      Version 1.73.91 Chromium: 131.0.6778.85 (Official Build) (64-bit)
    - Mozilla firefox for Linux Mint
      mint-001 - 1.0
      133.0(64-bit)

- **PostgreSQL**:
	- psql (PostgreSQL) 14.13 (Ubuntu 14.13-0ubuntu0.22.04.1)

-	Python: Used to build the data pipeline. It retrieves the initial data, loads it into the GCS Bucket, and establishes a staging table in BigQuery. Python then triggers DBT to perform data transformations.


-	Prefect: Serves as a pipeline orchestration tool, facilitating the scheduling and execution of pipelines. The Prefect server will be hosted locally. Prefect also provides agents that poll jobs in the queue and execute them.

-	DBT (Data Build Tool): Used for data transformation tasks.

-	Google looker Studio: Provides data visualization.

## Pipeline
Following Conditions needs to be met (Steps provided in [Project Reproduction](#project-reproduction) Section) for successful pipeline run:
-	Prefect's server running locally - Terminal B
-	Prefect's Agent is listening - Terminal C

![pipeline_ver_1.0](/images/pipeline_ver_1.0.jpg)

Explanation:
1.	Use Terraform to deploy Google Cloud Storage Bucket and BigQuery resources.
2. On the 1st day of each month at 8 am PST, the Prefect agent executes the scheduled job.
3. The pipeline retrieves missing months of Seattle Crime Data starting from January 2022 via an API until the most recent last month. For example, if the code is executed in July 2023, it will retrieve monthly data up until June 2023.
4. The retrieved data is saved as parquet files and loaded into the Google Cloud Storage (GCS) Bucket.
5. The loaded parquet data is then used to establish a staging table in BigQuery.
6. DBT (Data Build Tool) conducts transformations on the staging table to establish a fact table in BigQuery.
7. The fact table is utilized by Looker Studio to conduct visual analysis for Seattle crime.



## Project Reproduction
This project has been tested on Linux mint, utilizing command line.Please adjust accordingly to your prefered system.

**1. Clone the repo to the desired directory**

**2. Set up GCP:**
- Register for a GCP account and create a project (note down the project ID).
- Set up a GCP IAM service account:
    - Go to IAM > Service accounts > Create service account.

    - Grant the following roles: Viewer, Storage Admin, Storage Object Admin, BigQuery Admin.

    - Skip the third option.

- Create and store your Google Cloud service account JSON key:

    - With the service account you just created, click on Actions (three dots) > Manage keys > Add key and choose the JSON option. Put the downloaded JSON key into the creds directory (from the cloned project).

- Open a terminal (Terminal A) and navigate to the cloned directory and activate your virtual environment.

- Install the [gcloud CLI](https://cloud.google.com/sdk/docs/install), and then run  `gcloud version` in Terminal A to see if the CLI is installed.

- Initialize the gcloud CLI in Terminal A:

    - Set an environment variable for the service account JSON key by running:

        `export GOOGLE_APPLICATION_CREDENTIALS="<absolute path to the JSON file in the creds folder>"`
		
	- Update the `GOOGLE_APPLICATION_CREDENTIALS` environment variable in the .env file with the same absolute path to the JSON file.

**3. Set up before Using Terraform:**
    
- Allow Terraform to be executed from any directory:
		- Download Terraform and place it in the desired directory.
		- In your system's environmental variable, Under the variable PATH, add an absolute path to the directory that holds terraform executable.

- Enable GCP APIs by clicking on the following links, select the correct project:
     
    [Enable IAM APIS](https://console.cloud.google.com/apis/library/iam.googleapis.com)

    [IAMcredentials APIS](https://console.cloud.google.com/apis/library/iamcredentials.googleapis.com)


**4. Configure Terraform to deploy GCS Bucket and BigQuery:**
- In the cloned files, open `variables.tf` in terraform directory. Go to line 9, change regions variable from `default="us-west1"` into `default = "your-region1"`

- In Terminal A, cd to `terraform` directory

- Run: `gcloud auth application-default login`

- When prompted enter `Y` to continue, and make sure you are using the correct google account for authentication.

- Run: `terraform init` 

- Run: `terraform plan` and input your GCP project ID (noted earlier). Review the configuration to ensure it looks correct.

- Run: `terraform apply`, On GCP, you should see BigQuery set up, and also a new bucket in GCS. 

- In Terminal A, navigate back to the cloned project directory.


**5. Pipeline dependencies and Prefect blocks set up**
- Set up virtual env and make sure all dependencies are installed via `requirement.txt`

    -	 Create a virtual environment(e.g.., with Conda): (You can use your desired way and adjust accordingly)

    -	 In terminal A, create an environment:  `conda create --name seattle_crime python=3.9`

    -	Activate the evnironment: `conda activate seattle_crime`

    -	Install dependencies: `pip install -r requirements.txt`

- Prefect Block Set up:

    - Spin up another terminal(Terminal B), activate your virtual environement, and run `prefect server start`. This terminal will act as local Prefect server.

    - Go to the Prefect local server GUI at http://127.0.0.1:4200/blocks. It should appear empty.

    - In Terminal A, run python `./setup/prefect_setup_blocks.py`. Re-vist and refresh the block GUI page, the new blocks should appear.
					
			
	
**6. Deploy the pipeline for automation**
- Deploy the pipeline to Prefect to allow for automation. This will schedule execution at 3 pm UTC on the first day of each month: `prefect deployment create seattle_crime_watch_etl.py:parent_process_data -n "seattle_crime_etl" --cron "0 15 1 * *" -a`

- Set up an agent to pick up scheduled jobs for execution:
    - Spin up another terminal (Terminal C), activate your virtual environment, and run `prefect agent start -q default`. This will make the agent look for jobs in the default work queue.


If you have successfully followed these steps, congratulations! The Seattle Crime Watch Pipeline has been set up successfully.
			
## Future Improvements
-	Dockerize the set up
-	Have everything run via cloud 
		
		
			






Grader's creditials
id: admin
pw: secret

To test encryption functionalities:
