A vizualization extension for Qlik Sense

Data Overviewer gives the user a helicopter view of the data through an interactive grid of charts.

It orders the data out of the box by placing all fields with numerical values on the Y axis and the remaining fields as dimensions on the X axis.
It's possible to control which data fields, dimensions and measures should be included through object properties.

The grid behaves as a map when it comes to interaction by allowing the user to pan and zoom to discover more data.

The charts show data with different granularity depending on zoom level.

It's possible to switch between bar chart and line chart representation.

![alt tag](https://cloud.githubusercontent.com/assets/13997395/9591419/8a0b3fcc-503b-11e5-9d94-2709a2edb0aa.gif)
![alt tag](https://cloud.githubusercontent.com/assets/13997395/11484620/4b425882-97af-11e5-8f59-8663eb756d43.gif)

###Technical details
Data reduction is used which shows an approximation of the actual data. The approximation gets more accurate the more you zoom in (3 granularity levels).

Clicking on a chart brings up the "real object" which will reveal all the details.

Null values are excluded in the grid charts but present in the real charts.

At low zoom levels, charts are represented by icons, due to performance reasons.

The visualization is (of course) "snapshotable" and will scale properly in storytelling.

###Whats next in the pipe?
- [x] More configuration possibilities regarding which data fields to include in the grid. Probably through object properties.
- [x] More aggregation functions (Sum is used today)
- [ ] Increased rendering performance (fetch data in a smarter way?)
