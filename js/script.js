let selected = {
  code: "",
  fill: ""
}
let data;
let chart;
const COLORS = {
  "default": "#cccccc",
  "bar": "#5cd",
  "line": "#fc3",
  "netflow": [
    // Light mode
    [null,-1000,"#2166AC"],
    [-1000,-500,"#4393C3"],
    [-500,-50,"#92C5DE"],
    [-50,0,"#D1E5F0"],
    [0,50,"#FDDBC7"],
    [50,500,"#F4A582"],
    [500,1000,"#D6604D"],
    [1000,null,"#B2182B"]
  ],
  "growth": [
    [null,   1, "#f4f2fd"],
    [1,      5, "#bdc3d3"],
    [5,     10, "#8497aa"],
    [10,    50, "#4a6e7f"],
    [50,  null, "#034752"]
  ]
};
const UNIT = {
  "netflow": "百万円",
  "growth": "倍",
};


const init = () => {

  const getCityValue = (city, type) => {

    let ret = 0;

    if (type === "netflow") {
      ret = city[24] - city[26];
    }

    if (type === "growth") {
      ret = (city[14] === 0) ? "-": city[24] / city[14];
    }

    return ret;
  }

  const updateMapColors = () => {

    const getColor = (city) => {
      let ret = COLORS.default;

      if (city) {
        let type = $("#switch").find(".switch-item.selected").attr("code");
        let value = getCityValue(city, type);
            if (type === "netflow") value = value / 1000;
        let filtered = COLORS[type].filter(d => {
          return (d[0] === null || d[0] <= value) && (value <= d[1] || d[1] === null);
        });

        ret = (filtered[0]) ? filtered[0][2]: "#cccccc";
      }

      return ret;
    }

    $("#map").find("path").each(function(){
      let code = $(this).attr("code");
      let color = getColor(data[code]);
      $(this).attr("fill", color);
    });

    selected = {
      code: "",
      fill: ""
    }
  }

  const addCommas = (num) => {
    return String(num).replace( /(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
  }

  const showCityInfo = (props) => {

    const updateInfoChart = (city) => {

      let values = [[],[]];
      let colors = [[],[]];

      for (let i = 0; i <= 24; i += 2) {
        values[0].push(city[i + 1]);
        values[1].push(city[i]);
        colors[1].push(COLORS.bar);
      }

      chart.config.data.datasets[0].data = values[0];
      chart.config.data.datasets[1].data = values[1];
      chart.config.data.datasets[0].backgroundColor = colors[0];
      chart.config.data.datasets[1].backgroundColor = colors[1];
      chart.update();
    }

    let title = props["N03_001"];
    if (props["N03_003"]) title += " " + props["N03_003"];
    if (props["N03_004"]) title += " " + props["N03_004"];
    $("#info-content").find("h3").text(title);

    let city = data[props["N03_007"]];
    let netflow = getCityValue(city, "netflow");
    let growth  = getCityValue(city, "growth");
        growth  = (growth == "-") ? "-": addCommas(Number.parseFloat(growth).toFixed(1));
    $("#info-table-inflow").text(addCommas(city[24]));
    $("#info-table-outflow").text(addCommas(city[26]));
    $("#info-table-netflow").text(addCommas(netflow));
    $("#info-table-growth").text(growth);

    updateInfoChart(city);
    $("#info").addClass("show");
  }

  const drawMap = () => {

    let width  = $("#map").width();
    let height = $("#map").height();

    $("#map").empty();

    let projection = d3.geoMercator();

    projection = d3.geoMercator()
          .center([138, 37])
          .translate([width/2, height/2])
          .scale(4000);

    let svg = d3.select("#map");
    let path = d3.geoPath().projection(projection);
    let g = svg.append("g");

    let filepath = "https://raw.githubusercontent.com/smartnews-smri/japan-topography/main/data/municipality/topojson/s0010/N03-21_210101_designated_city.json";
    let filekey = "N03-21_210101";

    d3.json([filepath]).then(function(topology) {
      const maps2geo = topojson.feature(topology, topology.objects[filekey]);
      g.selectAll("path")
        .data(maps2geo.features)
        .enter().append("path")
        .attr("d", path)
        .attr("fill", $("#input-default-color").val())
        .attr("code", function(d){
         return d.properties["N03_007"];
        })
        .on('click tap touch', function(d, i){
          if (data[d.properties["N03_007"]]) {

            if (selected.code != "") {
              $("#map").find("path[code='" + selected.code + "']").attr("fill", selected.fill);
            }

            selected.code = d3.select(this).attr("code");
            selected.fill = d3.select(this).attr("fill");
            d3.select(this).attr('fill', "yellow");
            showCityInfo(d.properties);
          } else {
            $("#info").removeClass("show");
          }
        });

      d3.json("./data/data.json").then(function(d) {
        data = d;
        updateMapColors();
      });
    });

    let zoom = d3.zoom()
          .scaleExtent([0.3, 100])
          .on('zoom', function() {
              g.selectAll('path').attr('transform', d3.event.transform);
    });

    svg.transition()
        .duration(0)
        .call(zoom.transform, d3.zoomIdentity);

    svg.call(zoom);
  }

  const drawInfochart = () => {

    const getAspectRatio = ($chart) => {
      let w = $chart.innerWidth();
      let ret = 1.6;
      if (400 <= w) ret = 2.0;
      return ret;
    }

    const getYAxisLabel = (label) => {
      let ret = addCommas(label);

      if (parseInt(label) >= 10000) {
        ret = (parseInt(label) / 10000).toString() + "万";
      }

      if (parseInt(label) >= 100000000) {
        ret = (parseInt(label) / 100000000).toString() + "億";
      }

      if (parseInt(label) <= -10000) {
        ret = (parseInt(label) / 10000).toString() + "万";
      }

      if (parseInt(label) <= -100000000) {
        ret = (parseInt(label) / 100000000).toString() + "億";
      }

      return ret;
    }

    const adjustInfoContentHeight = () => {
      let t = $("#info-content").outerWidth();
      $("#info-content").css("right", "-" + t + "px");
    }

    let $chart = $("#info-chart").empty().html("<canvas></canvas>");
    let $canvas = $chart.find("canvas")[0];

    let config = {
      type: "bar",
      data: {
        labels: ["2008","2009","2010","2011","2012","2013","2014","2015","2016","2017","2018","2019","2020"],
        datasets: [{
          label: "寄付件数",
          type: "line",
          backgroundColor: [],
          fill: false,
          borderColor: COLORS.line,
          borderWidth: 4,
          pointRadius: 0,
          pointStyle: "line",
          yAxisID: "y-axis-2",
          data: []
        },{
          label: "寄付額",
          backgroundColor: [],
          borderColor: "transparent",
          yAxisID: "y-axis-1",
          data: []
        }]
      },
      options: {
        aspectRatio: getAspectRatio($chart),
        animation: {
          duration: 450
        },
        layout: {
          padding: {
            top: 0
          }
        },
        interaction: {
          mode: 'index'
        },
        elements: {
          line: {
            tension: 0.1
          }
        },
        legend: {
          display: true,
          reverse: true,
          labels: {
            usePointStyle: true,
            fontColor: "rgba(255, 255, 255, 0.7)",
          }
        },
        title: {
          display: false
        },
        tooltips: {
          xPadding: 24,
          yPadding: 12,
          displayColors: false,
          callbacks: {
            title: function(tooltipItem){
              return tooltipItem[0].xLabel.trim() + "年度";
            },
            label: function(tooltipItem, data){
              let contents = [];
              data.datasets.map((dataset, i) => {
                let content = dataset.label + ": " + addCommas(dataset.data[tooltipItem.index]) + " " + ["件", "千円"][i];
                contents.unshift(content);
              });
              return contents;
            }
          }
        },
        scales: {
          xAxes: [{
            stacked: true,
            gridLines: {
              display: false,
              zeroLineColor: "rgba(255,255,255,0.2)"
            },
            ticks: {
              fontColor: "rgba(255, 255, 255, 0.5)",
              maxRotation: 0,
              minRotation: 0,
              callback: (label) => {
                return " " + label + " ";
              }
            }
          }],
          yAxes: [{
            id: "y-axis-1",
            type: "linear",
            position: "left",
            gridLines: {
              display: true,
              zeroLineColor: "rgba(255,255,255,0.2)",
              borderDash: [3, 1],
              color: "rgba(255,255,255,0.2)"
            },
            ticks: {
              beginAtZero: true,
              fontColor: "rgba(255, 255, 255, 0.5)",
              maxTicksLimit: 6,
              callback: (label) => getYAxisLabel(label)
            }
          },{
            id: "y-axis-2",
            type: "linear",
            position: "right",
            gridLines: {
              display: false,
              zeroLineColor: "rgba(255,255,255,0.2)",
              borderDash: [3, 1],
              color: "rgba(255,255,255,0.2)"
            },
            ticks: {
              beginAtZero: true,
              fontColor: "#888",
              maxTicksLimit: 6,
              callback: (label) => getYAxisLabel(label)
            }
          }]
        }
      }
    };

    chart = new Chart($canvas.getContext('2d'), config);

    adjustInfoContentHeight();
  }

  const drawLegendTable = () => {
    $("#switch").find(".switch-item").each(function(){
      let code = $(this).attr("code");
      COLORS[code].map(function(d){
        let s = (d[0] === null) ? "": addCommas(d[0]) + '<span>' + UNIT[code] + '</span>';
        let e = (d[1] === null) ? "": addCommas(d[1]) + '<span>' + UNIT[code] + '</span>';

        let html =  '<tr>'
                    + '<td>' + s + '</td>'
                    + '<td>〜</td>'
                    + '<td>' + e + '</td>'
                    + '<td><div class="circle" style="background-color:' + d[2] + '"></div></td>'
                  + '</tr>';

        $(".legend-table." + code).find("tbody").append(html);
      });
    });
  }

  const bindEvents = () => {
    $("#switch").find(".switch-item").on("click", function(){
      if (!$(this).hasClass("selected")) {
        $(this).siblings().removeClass("selected");
        $(this).addClass("selected");
        updateMapColors();
      }
    });

    $("#info-button-close").on("click", function(){
      $("#info").removeClass("show");
    });

    $("#intro-button").on("click", function(){
      $("#intro").addClass("show");
    });

    $("#intro-button-show").on("click", function(){
      $("#intro").removeClass("show");
    });

    $("#map").on("click", function(e){
      if (!$(e.target).closest("path")[0]) {
        $("#info").removeClass("show");
      }
    });
  }

  drawMap();
  drawInfochart();
  drawLegendTable();
  bindEvents();
  $("#intro").addClass("show");
}



$(function(){
  init();
});
