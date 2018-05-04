let esprima = require('esprima')
let estraverse = require('estraverse')
let esrefactor = require('esrefactor')
let esutils = require('esutils')
let escodegen = require('escodegen')
let fs = require('fs')

const getDefineImports = expression => {
  // takes an expression for "define" and returns the array variable of importing
  // libraries

  // no arguments means nothing to return
  if (expression.arguments.length == 0) return []

  // if first argument is an array then there's the imports
  if (expression.arguments[0].type === 'ArrayExpression')
    return expression.arguments[0]

  // if we only have one argument that's not the array of imports
  // we have no imports to work with
  if (expression.arguments.length === 1) return []

  // second argument of array would be imports
  if (expression.arguments[1].type === 'ArrayExpression')
    return expression.arguments[1]

  // catch all
  return []
}

const getBaseStatement = (statements, range) => {
  // searches for statements surrounding the given range and returns the last one
  return statements
    .filter(
      statement =>
        statement.range[0] <= range[0] && statement.range[1] >= range[1]
    )
    .pop()
}

const getNewVariableIndex = (referenceStatement, reference) => {
  // we've located a statement where there's a reference, now we're trying to find out how that reference is
  // used and what in the code we want to look for next
  switch (referenceStatement.type) {
    case 'IfStatement':
      // reference is in an if statement, we don't need to track a path here
      return -1
    case 'ExpressionStatement':
      if (referenceStatement.expression.type === 'CallExpression') {
        // TODO: this is where it would hit if the reference is an argument in a function (or a function)
        // would be nice to track through the functions
        return -1
      }
      // this line is part of an assignment, so we shouldn't be concerned here because the variable is being overwritten
      if (referenceStatement.expression.left.name === reference.name) return -1

      // this is where we are capturing the assignment of a variable
      return referenceStatement.expression.left.property
        ? referenceStatement.expression.left.property.range[0]
        : referenceStatement.expression.left.range[0]
    case 'VariableDeclaration':
      let foundDeclaration
      if (
        referenceStatement.declarations.some(declaration => {
          // we only care about a variable declaration where there's an
          // init that uses the reference we're looking for. Because we are passing
          // in a specific reference we shouldn't ever get a false from this "some" call
          foundDeclaration = declaration
          return (
            declaration.init &&
            declaration.init.callee &&
            declaration.init.callee.object.name === reference.name
          )
        })
      )
        return foundDeclaration.id.range[0]
  }
  return -1
}

/**  **/
const findUsages = (
  refactorContext,
  currentUsages,
  statements,
  variableIndex
) => {
  // get the refactor variable at the specified location
  let qlikRefactor = refactorContext.identify(variableIndex)
  if (qlikRefactor) {
    qlikRefactor.references.forEach(reference => {
      // if true the reference is the declaration
      if (variableIndex === reference.range[0]) return

      // get the statement the given reference is a part of
      let referenceStatement = getBaseStatement(statements, reference.range)

      console.log(
        `  found reference for "${reference.name}" at line ${
          referenceStatement.loc.start.line
        }`
      )

      console.log('    ', escodegen.generate(referenceStatement))



      // add the given reference to the list of found stuff
      currentUsages.push({
        name: reference.name,
        loc: referenceStatement.loc
      })

      // get the new index to start with
      let newIndex = getNewVariableIndex(referenceStatement, reference)

      if (newIndex >= 0)
        // run this function again with the new index and concat the arrays
        currentUsages = [
          ...currentUsages,
          ...findUsages(refactorContext, [], statements, newIndex)
        ]
    })
  }
  return currentUsages
}

let findQlikReferences = file => {
  let qlikUsages = []
  let fileContent = fs.readFileSync(file).toString()
  let refactorContext = new esrefactor.Context(fileContent)
  let program = esprima.parseScript(fileContent, {
    tokens: true,
    range: true,
    loc: true
  })
  // searches all expressions in the program body
  let qlikDefines = program.body
    .filter(expression => expression.type === 'ExpressionStatement')
    // pull the expression module
    .map(expression => expression.expression)
    // get just CallExpressions
    .filter(expression => expression.type === 'CallExpression')
    // get only calls to defined
    .filter(expression => expression.callee.name === 'define')
    // check to see if they use the 'qlik' library
    .filter(expression => {
      let array = getDefineImports(expression)
      return (
        array.elements &&
        array.elements.filter(element => element.value === 'qlik').length > 0
      )
    })

  qlikDefines.forEach(expression => {
    console.log(`Found declaration of "qlik" at line ${expression.loc.start.line}`)
    
    let arguments = getDefineImports(expression)
    let qlikIndex = 0
    while (arguments.elements[qlikIndex].value !== 'qlik') qlikIndex++

    // last argument of define should be function we want to search
    let defineFunction = expression.arguments[expression.arguments.length - 1]
    let statements = []
    estraverse.traverse(defineFunction.body, {
      enter: function(node, parent) {
        if (esutils.ast.isStatement(node)) statements.push(node)
      }
    })
    let qlikVariableName = defineFunction.params[qlikIndex].name
    let qlikVariableStartIndex = defineFunction.params[qlikIndex].range[0]
    // add the qlik variable declaration to the list returned
    qlikUsages.push({
      name: qlikVariableName,
      loc: expression.loc
    })

    qlikUsages = [...qlikUsages,...findUsages(
      refactorContext,
      [],
      statements,
      qlikVariableStartIndex
    )]
  })
  return qlikUsages
}

module.exports = findQlikReferences