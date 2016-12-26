# shortbread

The purpose of _shortbread_ is to accept a bunch of CSS and JavaScript resources and output 2 different optimized HTML fragments:

1. One that asynchronously loads the given resources for the very first time (i.e. when it's the user's very first visit or after the resources have changed).
2. One that loads the resources for successive visits.

Shortbread accepts these 4 arguments:

1. `critical`: A single CSS resource that is considered "critical" and will be inlined for first loads.
2. `css`: A CSS resource (or list of such) that will be loaded assynchronously.
3. `js`: A JavaScript resource (or list of such) that will be loaded assynchronously.
4. `callback`: A callback function (or list of such) that will be called when all given resources have been loaded.

