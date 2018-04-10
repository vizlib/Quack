# Q.U.A.C.K - Qlik Unsupported Api Checker King

![quack](quack.png)

Extractor to build a check list for removed or deprecated properties and methods.

App used: Monitor release - public APIs NEW - Sense
[https://branch.qlik.com/sense/app/557d299b-e557-45e3-9286-6b47bc189dd6](https://branch.qlik.com/sense/app/557d299b-e557-45e3-9286-6b47bc189dd6)

## Install

```npm install```

## Run Extractor

```node extractor```

## Extractor Results

Example:
[/results/data/monitor-api-data.json](/results/data/monitor-api-data.json)

## Run Code Checker

```node codecheck```

## Code Checker Results

```
file: C:\Users\Win7\Documents\Qlik\Sense\Extensions\VizlibTable\properties.js
found "qlik" at line 1, pos 9:  define(['qlik',
file: C:\Users\Win7\Documents\Qlik\Sense\Extensions\VizlibTable\VizlibTable.js
found "qlik" at line 31, pos 9:          "qlik",
file: C:\Users\Win7\Documents\Qlik\Sense\Extensions\VizlibTable\VizlibTable_scripts\horizontal-virtualization.js
found "qlik" at line 2, pos 2:          'qlik',
file: C:\Users\Win7\Documents\Qlik\Sense\Extensions\VizlibTable\VizlibTable_scripts\VizlibTableSearchDirective.js
found "qlik" at line 3, pos 9:  define(['qlik', 'qvangular'], function (qlik, qvangular) {
file: C:\Users\Win7\Documents\Qlik\Sense\Extensions\VizlibTable\lib\angular-vs-repeat\angular-vs-repeat.js
found "qlik" at line 6, pos 9:  define(['qlik', 'qvangular'], function (qlik, qvangular) {
file: C:\Users\Win7\Documents\Qlik\Sense\Extensions\VizlibTable\VizlibTable_scripts\cell\cell.directive.js
found "qlik" at line 2, pos 2:          'qlik',
file: C:\Users\Win7\Documents\Qlik\Sense\Extensions\VizlibTable\VizlibTable_scripts\header-cell\header-cell.directive.js
found "qlik" at line 2, pos 2:          'qlik',
file: C:\Users\Win7\Documents\Qlik\Sense\Extensions\VizlibTable\VizlibTable_scripts\row\row.directive.js
found "qlik" at line 2, pos 2:          'qlik',
file: C:\Users\Win7\Documents\Qlik\Sense\Extensions\VizlibTable\VizlibTable_scripts\totals\totals.directive.js
found "qlik" at line 2, pos 2:          'qlik',
file: C:\Users\Win7\Documents\Qlik\Sense\Extensions\VizlibTable\VizlibTable_scripts\shared\alternate-states\alternateStates.js
found "qlik" at line 1, pos 9:  define(["qlik",
finished checking extension (10 occurances): C:\Users\Win7\Documents\Qlik\Sense\Extensions\VizlibTable
```
