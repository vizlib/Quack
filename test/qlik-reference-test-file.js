define(["qlik"], function (qlik) {
  let app = qlik.currApp()
  let emptyVar, scriptContent = app.getScript()

  passVariableToFunction(app)
})

define([], function() {
  console.log('this would be an empty function with no call to qlik')
})

define('DefineWithName',["qlik"], function(differentVariable) {
  let newApp = differentVariable.currApp()
})