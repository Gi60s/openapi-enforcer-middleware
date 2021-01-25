import Express from 'express'

export function docsMiddleware (specUrlPath: string, serverPort: number) {
  // @ts-ignore
  return function (req: Express.Request, res: Express.Response, next: Express.NextFunction) {
    // Docs don't require initialization

    // Trim leading slash
    let cleanedStr = (specUrlPath.charAt(0) === '/') ? specUrlPath.substr(1) : specUrlPath

    // TODO: Return redoc docs
    res.send(`
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>ReDoc</title>
    <!-- needed for adaptive design -->
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">

    <!--
    ReDoc doesn't change outer page styles
    -->
    <style>
      body {
        margin: 0;
        padding: 0;
      }
    </style>
  </head>
  <body>
    <redoc spec-url="http://localhost:${serverPort}/${cleanedStr}"></redoc>
    <script src="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js"> </script>
  </body>
</html>
      `)
  }
}
