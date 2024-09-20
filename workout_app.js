

/**
ideas: csv to store things?
so i can reference from anywhere
 */


//Create exercise

// there will be a table for exercises
// adding exercise also requires a category

let exerciseList = ['jj'];

// this should eventually generate a form
// for user to input and submit
// doing readline for temp purpose
function createExercise() {
  // should also add exercise group
  // eventually each exercise will
  // need a unique identifier to be able to track
  // progress?
  const READLINE = require('readline-sync');
  let exName = '';

  console.log('Enter exercise name');

  // input exercise name, with validation
  while(true) {
    exName = READLINE.prompt();
    if ( ! exerciseList.includes(exName)) {
      exerciseList.push(exName); // add exercise to the list
      break;
    } else {
      console.clear();
      console.log(`"${exName}" is already in the exercise list, please enter something else`);
    }
    
  }

}

createExercise();
console.log(exerciseList);