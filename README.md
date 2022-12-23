<h1># da-advanced-smart-store-dbamigration-api</h1>

<p>This is designed to be used independently of the DbArchive Maigration UI 
https://github.com/advancedcsg/da-advanced-smart-store-dbamigration.git (Branch CTR-4087-UI)</p>

<p>When used in conjuction with the UI it will leverage the API endpoints in this API -
these are currently hardocded to be localhost:3332, this means that the UI and the API will need to both be used on the same local server.</p>

To run the API in listening mode: node ./bin/www
On environment where NPM is present: npm start

The current endpoints are currently:

<li>http://localhost:3332/api/dbConnect</li>
<li>http://localhost:3332/api/dbDisConnect</li>
<li>http://localhost:3332/api/getTables</li>

<a href="url"><img src="https://asset.brandfetch.io/idrVtxty7B/id3mw3VUzB.png" align="left" width="250" ></a>
<br>
<br>
<br>
<br>

<p>This is the location for the WIP Postman Collection for the da-advanced-smart-store-dbamigration-api.

Stored as json, they can be imported into Postman and used to allow external testing of the components listed above.</p>

<p>The collection contains links to a test/dev server, if you want to use this against your own databases then the connection strings will need to be changed accordingly.</p>

## JSON



<table>
<tr>
<td><b>Product</td>
<td><b>Path to JSON File</td>
<td><b>Role</td>
</tr>
<tr>
<td>Migration API</td>
<td><font size=”1”><a href="https://github.com/Adv-Luke-Webster/da-advanced-smart-store-dbamigration-api/blob/8c518095b30ce6518284a3df409b51c002acd694/da-advanced-smart-stor-dba-migration-api.postman_collection.json"</a>da-advanced-smart-stor-dba-migration-api.postman_collection.json</td>
<td>Used alogside UI or directly from Postman these API will perfrom the various tasks for DbArchive migration</td>
</tr>
</table>
