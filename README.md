# Workout App
**Table of contents**
-	[Agenda](#agenda)
-	[Technologies](#technologies)
-	[Concepts and Terminologies](#concepts-and-terminologies)
-	[Brief Explanation of How the App Works](#brief-explanation-of-how-the-app-works)
-	[Project Reproduction](#project-reproduction)
-	[Navigating the Workout App](#navigating-the-workout-app)


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


## Concepts and Terminologies

### A Workout Routine is composed by multiple workout sessions.
**Understanding Workout Routines and Sessions**  
A **workout routine** is a structured plan outlining your weekly workout and rest days. Each workout day includes a **session** focused on specific goals, such as targeting particular muscle groups.

For example, consider a routine that repeats weekly with workouts on Monday, Wednesday and Friday, and rest days on the others:

- **Monday: Upper Body Session**  
    Focus: Upper body strength  
    Exercises:
    
    - Push-ups
    - Pull-ups
- **Tuesday: Rest**
    
- **Wednesday: Lower Body Session**  
    Focus: Lower body strength  
    Exercises:
    
    - Squats
    - Lunges
- **Thursday: Rest**
    
- **Friday: Core Session**  
    Focus: Core strength  
    Exercise:
    
    - Sit-ups
- **Saturday: Rest**
    
- **Sunday: Rest**
    

Once you complete the routine for the week, you repeat it. This cycle helps to maintain consistency and achieve long-term fitness goals.

### How Do "Days" Factor Into Your Routine?

Workouts are often structured to repeat weekly, but routines don't have to strictly follow a weekly schedule. By organizing workouts by **Day**, the app provides flexibility, allowing users to progress at their own pace without being tied to a calendar.

For example:

- **Day 1: Upper Body Session**  
    Focus: Upper body strength  
    Exercises:
    
    - Push-ups
    - Pull-ups
- **Day 2: Rest**
    
- **Day 3: Lower Body Session**  
    Focus: Lower body strength  
    Exercises:
    
    - Squats
    - Lunges
- **Day 4: Rest**
    
- **Day 5: Core Session**  
    Focus: Core strength  
    Exercise:
    
    - Sit-ups
- **Day 6: Rest**
    
- **Day 7: Arms session**
	Focus: Arms strength
	Exercise:

	- Biceps Curl
	- Shoulder Raises
- **Day 8: Rest**

### About Workout Sessions

To keep the app simple, each **Day** is associated with a single workout **Session**. A session is composed of exercises arranged in the order specified by the user.

**Example:**

- **Day 1:**  
    **Session Name:** Upper Body  
    **Exercises:**
    1. Push-ups
    2. Pull-ups

In this example, the **Upper Body** session begins with push-ups, followed by pull-ups. This structure allows users to customize and execute their workouts in the sequence that suits them best.

### About Exercise Details

For each exercise in a session, the user begins by planning the target repetitions (commonly referred to as "reps") for that exercise.

**Example:**  
**Push-ups:**
- Set 1: Reps (goal): 20

For some users, completing 20 reps in a single set may not be sufficient for their workout goals. Instead, they might aim for 20 reps in the first set, take a 1-minute rest, and then aim for another 20 reps in the second set.

Each attempt is referred to as a **Set**, and the following can be described as a goal of **2 sets of 20 reps**:

**Push-ups:**
- Set 1: Reps (goal): 20
- Set 2: Reps (goal): 20


## Brief Explanation of How the App Works
1. **Sign In:**  
    Users log in using credentials provided further down in this README.
    
2. **Create a Workout Routine:**  
    Users design their personalized workout routine by adding sessions and exercises.
    
3. **Select a Routine to Train:**  
    Users choose the workout routine they wish to follow.
    
4. **Start the Workout:**  
    During the workout, users log progress by clicking "Done" after completing each set.
    
5. **Complete the Workout:**  
    Once the session is finished, users click "Complete Workout" to save their progress.
    
6. **Refer to Records:**  
    Users can view their previously recorded workout data to track progress over time.


## Decisions and/or Trade-Offs

#### 1. Focus on Repetition-Based Exercises

To keep the app simple, it only supports logging exercises based on repetitions.

- **Example:** Users can log "Push-ups" for 20 reps but cannot log duration-based exercises like jogging for 30 minutes.
- Technically, jogging can be logged as follows, but this approach may cause confusion and is therefore not recommended.
    `Jogging: 1 set of 30 reps`.  


#### 2. Single Session Per Day

The app only allows one session per day.

- **Reasoning:** Most people only work out once per day, making this a sufficient and practical limitation.

#### 3. Many-to-Many Relationships in the Schema

The database schema allows for flexible many-to-many relationships:

- **Setup Schema:**
    - `setup_days` ↔ `setup_sessions`
- **Track Schema:**
    - `track_days` ↔ `track_sessions`

However, to reduce complexity, the app's UI restricts users to associating only one session per day.

#### 4. Unused Columns in Tables

Certain tables include unused columns that are reserved for future features.

- **Example:** The `myo_order` column is currently unused but will be essential for planned features.
- **Reasoning:** As I plan to use this app for my own workouts, these columns were preemptively added to accommodate future development.

#### 5. Inconsistent Button Styling

The app's buttons vary in style, with some using default styling and others being customized.

- **Reasoning:** Initially, I aimed to style the app consistently but lacked the time to fully address this aspect, leading to sporadic styling.

#### 6. UUIDs as Table IDs

The app uses UUIDs as primary keys instead of `serial` integers.

- **Advantages:**
    - UUIDs are globally unique, which simplifies certain queries.
    - **Easier Query:** With a UUID, you can directly pinpoint a specific routine's session's exercise. Using integers would require multiple JOIN operations with additional conditions.

#### 7. Duplicate-Looking Tables

The app has tables that may appear duplicated but serve distinct purposes:

- **Setup Tables:** These store the created workout routines.
- **Track Tables:** These track completed workout sessions.

**Reasoning:**  
Initially, I considered having workout logs reference routines directly. However, any changes to a routine would affect historical records, which is undesirable.

To resolve this, I implemented **"snapshot" tables**:

- At the start of a workout, the app copies the current routine's session to a "snapshot" table.
- This snapshot is used for tracking live workouts, it then serves as historical reference. 

This approach ensures that workout records are preserved even if the routine changes in the future.

#### 8. Meeting CRUD Requirements for Primary Tables

The app emphasizes the importance of CRUD  operations for primary tables. However, I have good amount of these tables serving different purposes, so their CRUD functionalities vary.

**Primary Tables - Main**  
These tables support full CRUD operations, as they are directly manipulated by users:

- `setup_routines`
- `setup_days`
- `setup_sessions`
- `setup_session_exercises`
- `setup_exercise_details`

**Primary Tables - Secondary**  
These tables have more limited CRUD functionality due to their specific roles in the app:

- `track_routines`: Supports Create, Read, and Delete (CRD).
- `track_days`: Supports Create, Read, and Delete (CRD).
- `track_sessions`: Supports Create, Read, and Delete (CRD).
- `track_session_exercises`: Supports full CRUD operations.
- `track_exercise_details`: Supports full CRUD operations.




## Project Reproduction
This project has been tested on Linux mint, utilizing command line.Please adjust accordingly to your prefered system.



Follow these steps to set up and run the workout app on your local machine:

1. **Unzip the File**  
   - Unzip the project files to your desired directory.

2. **Navigate to the Project Directory**  
   - Open your terminal and navigate to the project directory:
     ```bash
     cd your/path/to/workout_app
     ```

3. **Verify Prerequisites**  
   Ensure the following dependencies are installed on your system:
   
   - **PostgreSQL**  
     - Check if PostgreSQL is installed:
       ```bash
       psql --version
       ```
     - If the version is displayed, you're good to go. Otherwise, install PostgreSQL.

   - **Node.js**  
     - Check if Node.js is installed:
       ```bash
       node --version
       ```
     - If the version is displayed, you're good to go. Otherwise, install Node.js.

4. **Establish the Database and Seed Data**  
   - Navigate to the database setup directory:
     ```bash
     cd your/path/to/workout_app/lib
     ```
   - Run the following command to set up the database and seed data:
     ```bash
     ./recreate_db_cmd.sh
     ```
   - **Note:** If this script fails, follow these manual steps instead:

     1. Drop the database (ignore errors if it doesn't exist):
        ```bash
        dropdb workout-app-db
        ```
     2. Create the database:
        ```bash
        createdb workout-app-db
        ```
     3. Execute the schema and seed files in order:
        ```bash
        psql -d workout-app-db < setup_schema.sql
        psql -d workout-app-db < track_schema.sql
        psql -d workout-app-db < users.sql
        psql -d workout-app-db < seed.sql
        ```

     - Upon successful execution, you should see these messages:
       - **SETUP tables DONE**
       - **TRACK tables DONE**
       - **User creation DONE. User details setup DONE.**
       - **INSERT seed DONE**

5. **Install Dependencies**  
   - Return to the root project directory:
     ```bash
     cd your/path/to/workout_app
     ```
   - Install the required dependencies:
     ```bash
     npm install
     ```

6. **Start the App**  
   - Start the server:
     ```bash
     npm start
     ```
   - You should see the message:
     ```
     Workout App is listening on port 3001 of localhost!
     ```

7. **Access the App**  
   - Open your browser (Firefox, Brave, or Chrome).  
   - Navigate to:
     ```
     http://localhost:3001
     ```
   - You should see the login page prompting you to sign in.

			
## Navigating the Workout App

### Your Credentials:

- **Username:** `admin`
- **Password:** `secret`

Since a pre-made routine has been provided via seed data, let’s get started with it.

---

### Step-by-Step Guide:

1. **Access Your Routine:**
    
    - Go to **"Routines"**.
    - Select **"Select Routine"**.
    - Use the dropdown to select the **"Push-Pull-Legs"** routine and click **"Confirm"**.
    - Your current workout routine is now set to **"Push-Pull-Legs"**.
2. **View and Edit the Routine:**
    
    - Click **"Edit Routine"** and select **"Push-Pull-Legs"** to edit.
    - You’ll notice the routine spans 7 days, with workouts on Day 1, Day 3, and Day 5.
3. **Explore Day 1's Session:**
    
    - Click on Day 1's **Session Name**, which takes you to the session setup page.
4. **Within the Session Setup Page:**  
    You can:
    
    - Create an exercise using the **"Create Exercise"** button (reusable across routines).
    - Add exercises via the dropdown menu.
    - Reorder exercises.
    - Click on an exercise name to adjust "sets" or "reps (goal)".
    - Delete exercises using the trash bin icon.
5. **Save Changes:**
    
    - Once adjustments are complete, click **"Back"** to reflect changes on the overview page.
    - Click **"Complete"** if you’re finished.
6. **Start Your Workout:**
    
    - On the home page, click the **"Start Workout"** button.
    - You’ll land on a page to track your workout for Day 1’s **Push Session**.
7. **Track Your Progress:**
    
    - For each set, enter the `weight` and `reps`, then click the **"Done"** button to update that specific set.
    - Note: All other buttons on this page affect only the current workout session.
8. **Complete Your Workout:**
    
    - Click **"Complete Workout"** to save the session.
9. **View Records:**
    
    - Go to **Records** to review the workout you just completed.
    - Click **"View"** for details.
10. **Return to Home Page:**
    
    - The **"Start Workout"** button now displays the next workout day and session (skipping rest days).

---

### Creating Your Own Workout Routine:

1. **Go to:**
    
    - Home Page > **Routines** > **Create Workout**.
2. **Establish a Workout Name:**
    
    - Enter a name and click **"Save and Next"**.
3. **Create Sessions:**
    
    - Add sessions for your routine.
    - **Suggestions:**
        - `Full Body 1`
        - `Full Body 2`
        - `Rest`
4. **Add Days and Assign Sessions:**
    
    - Add days and assign sessions to them.
    - **Suggestions:**
        - Day 1: Assign `Full Body 1`.
        - Day 2: Assign `Rest`.
        - Day 3: Assign `Full Body 2`.
        - Day 4: Assign `Rest`.
5. **Customize Session Details:**
    
    - Click on a session name to add, reorder, or remove exercises.
    - **Suggestions:**
        - For `Full Body 1`: Add push-ups and squats (2 sets each: 30 reps for push-ups, 10 reps for squats).
        - For `Full Body 2`: Add bench press and lunges (1 set each with your chosen reps).
6. **Finalize Your Routine:**
    
    - Click **"Complete"** when all session details are set.
7. **Select Your New Routine:**
    
    - Go to **"Select Routine"** and choose the routine you just created.
8. **Start Your New Workout:**
    
    - On the home page, the **"Start Workout"** button will now display the day and session from your new routine.
