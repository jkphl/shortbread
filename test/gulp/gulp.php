<!DOCTYPE html>
<html lang="en">
    <head><?php

        // If the shortbread cookie is present and matches the expected master hash: It's a subsequent page load
        if (!empty($_COOKIE['<%= cookie %>']) && ($_COOKIE['<%= cookie %>'] === '<%= hash %>')) {
            include 'initial.main.html';

        // Else: It's an initial page load
        } else {
            include 'subsequent.main.html';
        }

        ?><meta charset="UTF-8">
        <title>My site</title>
    </head>
    <body>
        <!-- Page content -->
    </body>
</html>
