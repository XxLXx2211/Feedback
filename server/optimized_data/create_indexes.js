// Script para crear índices en MongoDB
// Ejecutar con: mongo feedback-system create_indexes.js

// Índices para companies
db.companies.createIndex({"n":1}, {"background":true});

// Índices para employees
db.employees.createIndex({"n":1}, {"background":true});
db.employees.createIndex({"c":1}, {"unique":true,"background":true});
db.employees.createIndex({"e":1}, {"background":true});
db.employees.createIndex({"a":1}, {"background":true,"sparse":true});

// Índices para categories
db.categories.createIndex({"n":1}, {"unique":true,"background":true});
db.categories.createIndex({"a":1}, {"background":true,"sparse":true});

// Índices para questions
db.questions.createIndex({"t":"text"}, {"background":true});
db.questions.createIndex({"c":1}, {"background":true});
db.questions.createIndex({"a":1}, {"background":true,"sparse":true});

// Índices para feedbacks
db.feedbacks.createIndex({"e":1}, {"background":true});
db.feedbacks.createIndex({"c":1}, {"background":true});
db.feedbacks.createIndex({"co":1}, {"background":true});
db.feedbacks.createIndex({"f":1}, {"background":true});
db.feedbacks.createIndex({"p":-1}, {"background":true});

// Índices para feedbacklinks
db.feedbacklinks.createIndex({"t":1}, {"unique":true,"background":true});
db.feedbacklinks.createIndex({"f":1}, {"background":true});
db.feedbacklinks.createIndex({"e":1}, {"background":true});
db.feedbacklinks.createIndex({"a":1}, {"background":true,"sparse":true});

