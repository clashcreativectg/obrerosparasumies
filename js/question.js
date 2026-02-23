(function(){
  const titleQuestions = [...document.querySelectorAll('.questions__title')];

  titleQuestions.forEach(question => {
    question.addEventListener('click', () => {
      const answer = question.nextElementSibling;
      const addPadding = question.parentElement.parentElement;
      const arrow = question.querySelector('.questions__arrow');

      const isVisible = answer.classList.contains('questions__show--visible');

      // Cerrar todas las respuestas y quitar clases
      document.querySelectorAll('.questions__show').forEach(p => p.classList.remove('questions__show--visible'));
      document.querySelectorAll('.questions__padding').forEach(div => div.classList.remove('questions__padding--add'));
      document.querySelectorAll('.questions__arrow').forEach(arrowEl => arrowEl.classList.remove('questions__arrow--rotate'));

      // Si no estaba visible, mostrarla
      if (!isVisible) {
        answer.classList.add('questions__show--visible');
        addPadding.classList.add('questions__padding--add');
        arrow.classList.add('questions__arrow--rotate');
      }
    });
  });
})();