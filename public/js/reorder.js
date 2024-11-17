// //for future reference
// document.addEventListener("DOMContentLoaded", () => {
//   const list = document.querySelector(".reorder-list");
//   let draggedItem = null;

//   list.addEventListener("dragstart", (e) => {
//     draggedItem = e.target;
//     setTimeout(() => (e.target.style.display = "none"), 0);
//   });

//   list.addEventListener("dragend", (e) => {
//     setTimeout(() => {
//       draggedItem.style.display = "block";
//       draggedItem = null;
//     }, 0);
//   });

//   list.addEventListener("dragover", (e) => e.preventDefault());

//   list.addEventListener("dragenter", (e) => {
//     e.preventDefault();
//     if (e.target.classList.contains("draggable-item") && e.target !== draggedItem) {
//       list.insertBefore(draggedItem, e.target.nextSibling);
//     }
//   });

//   document.querySelector(".reorder-form").addEventListener("submit", () => {
//     const orderedIds = Array.from(list.children).map((item, index) => ({
//       id: item.dataset.id,
//       order: index + 1,
//     }));
//     document.querySelector("input[name='orderedExercises']").value = JSON.stringify(orderedIds);
//   });
// });
