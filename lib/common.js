// MIGRATION NOTICE — this file is in a "type":"module" (ESM) package and cannot be require()d.
// The canonical location of this module is: taskmanager/brain/scripts/lib/common.js
// If you are calling require('../lib/common') from a CJS script, update the path to:
//   require('../brain/scripts/lib/common')
// The taskmanager/brain/scripts/ directory has its own package.json with "type":"commonjs".
throw new Error(
  'common.js has moved to taskmanager/brain/scripts/lib/common.js — ' +
  'update your require() path to: require("../brain/scripts/lib/common")'
);
