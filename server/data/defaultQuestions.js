const defaultQuestions = [
  {
    texto: '¿Cómo calificarías el desempeño general del empleado?',
    tipo_respuesta: 'escala',
    importancia: 5
  },
  {
    texto: '¿El empleado cumple con los plazos establecidos?',
    tipo_respuesta: 'escala',
    importancia: 4
  },
  {
    texto: '¿Cómo es la calidad del trabajo entregado?',
    tipo_respuesta: 'escala',
    importancia: 5
  },
  {
    texto: '¿El empleado muestra iniciativa en su trabajo?',
    tipo_respuesta: 'escala',
    importancia: 3
  },
  {
    texto: '¿Cómo es la comunicación del empleado con el equipo?',
    tipo_respuesta: 'escala',
    importancia: 4
  },
  {
    texto: '¿El empleado tiene buena actitud hacia el trabajo?',
    tipo_respuesta: 'escala',
    importancia: 3
  },
  {
    texto: '¿El empleado es puntual y responsable con su horario?',
    tipo_respuesta: 'si_no',
    importancia: 2,
    preguntas_si_no: [
      {
        texto: '¿Llega a tiempo a las reuniones?',
        orden: 1
      },
      {
        texto: '¿Cumple con su horario de trabajo?',
        orden: 2
      },
      {
        texto: '¿Avisa con anticipación cuando no puede asistir?',
        orden: 3
      }
    ]
  },
  {
    texto: '¿Qué aspectos consideras que el empleado podría mejorar?',
    tipo_respuesta: 'texto',
    importancia: 3
  },
  {
    texto: '¿Qué fortalezas destacarías del empleado?',
    tipo_respuesta: 'texto',
    importancia: 3
  }
];

module.exports = defaultQuestions;
