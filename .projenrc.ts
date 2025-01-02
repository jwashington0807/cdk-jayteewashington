import { awscdk } from 'projen';
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.173.4',
  defaultReleaseBranch: 'master', // NOT WOKE
  name: 'cdk-jayteewashington',
  projenrcTs: true,
  appEntrypoint: '../bin/app.ts',

  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();
