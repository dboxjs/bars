import * as d3 from 'd3';
import * as _ from 'lodash';

/*
 * Simple Bar chart
 */
export default function (config, helper) {

  //Link Bars to the helper object in helper.js
  var Bars = Object.create(helper);

  Bars.init = function (config) {
    var vm = this;

    vm._config = config ? config : {};
    vm._data = [];
    vm._scales = {};
    vm._tip = vm.utils.d3.tip()
      .attr('class', 'd3-tip')
      .direction('n')
      .html(vm._config.tip || function (d) {
        var html = '';
        html += d[vm._config.x] ? ('<span>' + (Number.isNaN(+d[vm._config.x]) || vm._config.xAxis.scale === 'band' ? d[vm._config.x] : vm.utils.format(d[vm._config.x], 1)) + '</span></br>') : '';
        html += d[vm._config.y] ? ('<span>' + (Number.isNaN(+d[vm._config.y]) || vm._config.yAxis.scale === 'band' ? d[vm._config.y] : vm.utils.format(d[vm._config.y], 1)) + '</span></br>') : '';
        return html;
      });
  };


  //-------------------------------
  //User config functions
  Bars.id = function (columnName) {
    var vm = this;
    vm._config.id = columnName;
    return vm;
  };

  Bars.x = function (columnName) {
    var vm = this;
    vm._config.x = columnName;
    return vm;
  };

  Bars.y = function (columnName) {
    var vm = this;
    vm._config.y = columnName;
    return vm;
  };

  /**
   * Used to draw a bar chart with multiple bars per group
   * @param {array} columns 
   */
  Bars.groupBy = function (columns) {
    var vm = this;
    vm._config.groupBy = columns;
    return vm;
  };

  /**
   * Used to draw a bar chart stacked with multiple bars per group
   * @param {array} columns 
   */
  Bars.stackBy = function (columnName) {
    var vm = this;
    vm._config.stackBy = columnName;
    return vm;
  };

  /**
   * column name used for the domain values
   * @param {string} columnName 
   */
  Bars.fill = function (columnName) {
    var vm = this;
    vm._config.fill = columnName;
    return vm;
  };

  /**
   * array of values used 
   * @param {array or scale} columnName 
   */
  Bars.colors = function (colors) {
    var vm = this;
    if (Array.isArray(colors)) {
      //Using an array of colors for the range 
      vm._config.colors = colors;
    } else {
      //Using a preconfigured d3.scale
      vm._scales.color = colors;
    }
    return vm;
  };

  Bars.sortBy = function (option) {
    //option = string [asc,desc] 
    //option = array for groupBy and stackBy
    var vm = this;
    vm._config.sortBy = option;
    return vm;
  };

  Bars.format = function (format) {
    var vm = this;
    if (typeof format == 'function' || format instanceof Function) {
      vm.utils.format = format;
    } else {
      vm.utils.format = d3.format(format);
    }
    return vm;
  };

  Bars.tip = function (tip) {
    var vm = this;
    vm._config.tip = tip;
    return vm;
  };

  Bars.legend = function (legend) {
    var vm = this;
    vm._config.legend = legend;
    return vm;
  };


  //-------------------------------
  //Triggered by the chart.js;
  Bars.data = function (data) {
    var vm = this;

    if (vm._config.filter) {
      //In case we want to filter observations
      data = data.filter(vm._config.filter);
    }

    if (vm._config.hasOwnProperty('stackBy') && Array.isArray(vm._config.stackBy) && vm._config.stackBy.length > 0) {
      // Used in a stackbar, transpose the data into layers 
      vm._data = d3.stack().keys(vm._config.stackBy)(data);
    } else {
      // Normal bar, save the data as numbers 
      vm._data = data.map(function (d) {
        if (d[vm._config.x] == Number(d[vm._config.x]))
          d[vm._config.x] = +d[vm._config.x];
        if (d[vm._config.y] == Number(d[vm._config.y]))
          d[vm._config.y] = +d[vm._config.y];
        return d;
      });
    }

    //@TODO - ALLOW MULITPLE SORTS
    if (vm._config.sortBy) {
      vm._data = vm._data.sort(function (a, b) {
        return a[vm._config.sortBy[0]] - b[vm._config.sortBy[0]];
      });
    }

    if (vm._config.hasOwnProperty('quantiles')) {
      vm._quantiles = vm._setQuantile(data);
      vm._minMax = d3.extent(data, function (d) {
        return +d[vm._config.fill];
      });
    }

    return vm;
  };

  Bars.scales = function () {
    var vm = this;
    var config;
    //vm._scales = scales;
    /* Use
     * vm._config.x
     * vm._config.xAxis.scale
     * vm._config.y
     * vm._config.yAxis.scale
     * vm._data
     */
    //Normal bars 
    if (vm._config.hasOwnProperty('x') && vm._config.hasOwnProperty('y')) {
      config = {
        column: vm._config.x,
        type: vm._config.xAxis.scale,
        range: [0, vm.chart.width],
        minZero: vm._config.xAxis.minZero
      };
      if (vm._config.xAxis.domains) {
        config.domains = vm._config.xAxis.domains;
      }
      vm._scales.x = vm.utils.generateScale(vm._data, config);

      config = {
        column: vm._config.y,
        type: vm._config.yAxis.scale,
        range: [vm.chart.height, 0],
        minZero: vm._config.yAxis.minZero
      };
      if (vm._config.yAxis.domains) {
        config.domains = vm._config.yAxis.domains;
      }
      vm._scales.y = vm.utils.generateScale(vm._data, config);
    }

    //GroupBy bars on the xAxis
    if (vm._config.hasOwnProperty('x') && vm._config.hasOwnProperty('groupBy')) {
      /* Generate x scale */
      config = {
        column: vm._config.x,
        type: vm._config.xAxis.scale,
        groupBy: 'parent',
        range: [0, vm.chart.width],
        minZero: vm._config.xAxis.minZero
      };
      if (vm._config.xAxis.domains) {
        config.domains = vm._config.xAxis.domains;
      }
      vm._scales.x = vm.utils.generateScale(vm._data, config);

      /* Generate groupBy scale */
      config = {
        column: vm._config.groupBy,
        type: 'band',
        groupBy: 'children',
        range: [0, vm._scales.x.bandwidth()],
      };
      vm._scales.groupBy = vm.utils.generateScale(vm._data, config);
      //vm.chart.scales.groupBy = vm._scales.groupBy; 

      /* Generate y scale */
      config = {
        column: vm._config.groupBy,
        type: vm._config.yAxis.scale,
        groupBy: 'data',
        range: [vm.chart.height, 0],
        minZero: vm._config.yAxis.minZero,
      };
      if(vm._config.yAxis.domains) {
        config.domains = vm._config.yAxis.domains;
      }
      vm._scales.y = vm.utils.generateScale(vm._data, config);
    }

    //GroupBy bars on the yAxis
    if (vm._config.hasOwnProperty('y') && vm._config.hasOwnProperty('groupBy')) {
      /* Generate y scale */
      config = {
        column: vm._config.y,
        type: vm._config.yAxis.scale,
        groupBy: 'parent',
        range: [0, vm.chart.height],
        minZero: vm._config.yAxis.minZero
      };
      if (vm._config.yAxis.domains) {
        config.domains = vm._config.yAxis.domains;
      }
      vm._scales.y = vm.utils.generateScale(vm._data, config);

      /* Generate groupBy scale */
      config = {
        column: vm._config.groupBy,
        type: 'band',
        groupBy: 'children',
        range: [0, vm._scales.y.bandwidth()],
      };
      vm._scales.groupBy = vm.utils.generateScale(vm._data, config);
      //vm.chart.scales.groupBy = vm._scales.groupBy; 

      /* Generate x scale */
      config = {
        column: vm._config.groupBy,
        type: vm._config.xAxis.scale,
        groupBy: 'data',
        range: [0, vm.chart.width],
        minZero: vm._config.xAxis.minZero
      };
      if (vm._config.xAxis.domains) {
        config.domains = vm._config.xAxis.domains;
      }
      vm._scales.x = vm.utils.generateScale(vm._data, config);
    }


    //Stack bars on the xAxis
    if (vm._config.hasOwnProperty('x') && vm._config.hasOwnProperty('stackBy')) {
      /* Generate x scale */
      config = {
        column: vm._config.x,
        type: vm._config.xAxis.scale,
        stackBy: 'parent',
        range: [0, vm.chart.width],
        minZero: vm._config.xAxis.minZero
      };
      if (vm._config.xAxis.domains) {
        config.domains = vm._config.xAxis.domains;
      }
      vm._scales.x = vm.utils.generateScale(vm._data, config);

      /* Generate y scale */
      config = {
        column: '',
        stackBy: 'data',
        type: vm._config.yAxis.scale,
        range: [vm.chart.height, 0],
        minZero: vm._config.yAxis.minZero
      };
      if (vm._config.yAxis.domains) {
        config.domains = vm._config.yAxis.domains;
      }
      vm._scales.y = vm.utils.generateScale(vm._data, config);
    }

    // Stack bars on the yAxis
    if (vm._config.hasOwnProperty('y') && vm._config.hasOwnProperty('stackBy')) {
      /* Generate x scale */
      config = {
        column: '',
        type: vm._config.xAxis.scale,
        stackBy: 'data',
        range: [0, vm.chart.width],
        minZero: vm._config.xAxis.minZero
      };
      if (vm._config.xAxis.domains) {
        config.domains = vm._config.xAxis.domains;
      }
      vm._scales.x = vm.utils.generateScale(vm._data, config);

      /* Generate y scale */
      config = {
        column: vm._config.y,
        stackBy: 'parent',
        type: vm._config.yAxis.scale,
        range: [vm.chart.height, 0],
        minZero: vm._config.yAxis.minZero
      };
      if (vm._config.yAxis.domains) {
        config.domains = vm._config.yAxis.domains;
      }
      vm._scales.y = vm.utils.generateScale(vm._data, config);
    }


    //vm.chart.scales.x = vm._scales.x;
    //vm.chart.scales.y = vm._scales.y;

    if (vm._config.hasOwnProperty('colors'))
      vm._scales.color = d3.scaleOrdinal(vm._config.colors);
    else
      vm._scales.color = d3.scaleOrdinal(d3.schemeCategory10);

    return vm;
  };

  Bars.drawLabels = function () {
    var vm = this;

    var charContainer = vm.chart.svg().selectAll('.dbox-label')
      .data(vm._data);

    charContainer.enter().append('text')
      .attr('class', 'dbox-label')
      .attr('x', function (d) {
        var value = vm._scales.x(d[vm._config.x]);
        if (vm._config.xAxis.scale == 'linear') {
          if (d[vm._config.x] > 0) {
            value = vm._scales.x(0);
          }
        }
        return value;
      })
      .attr('y', function (d) {
        var value =  vm._scales.y(d[vm._config.y]);
        var barH = vm._scales.y.bandwidth ? vm._scales.y.bandwidth() : Math.abs(vm._scales.y(d[vm._config.y]) - vm._scales.y(0));
        if (vm._config.yAxis.scale === 'linear') {
          if (d[vm._config.y] < 0) { 
            value = vm._scales.y(0);
          }
        }
        if (barH < 50) {
          return value - 30;
        }
        return value + 20;
      })
      .attr('transform', function(d) {
        var barW = vm._scales.x.bandwidth ? vm._scales.x.bandwidth() : Math.abs(vm._scales.x(d[vm._config.x]) - vm._scales.x(0));
        if (!isNaN(d[vm._config.y])) {
          return 'translate(' + barW/2 + ', 0)';
        } 
        return 'translate(' + (barW + 30) + ', 0)';
      })
      .text( function(d) {
        if (!isNaN(d[vm._config.y])) {
          return vm.utils.format(d[vm._config.y], 1) ? vm.utils.format(d[vm._config.y]) : '';
        }
        return vm.utils.format(d[vm._config.x], 1) ? vm.utils.format(d[vm._config.x]) : '';
      });
    
    charContainer.enter().append('text')
      .attr('class', 'dbox-label-coefficient')
      .attr('x', function (d) {
        var value = vm._scales.x(d[vm._config.x]);
        if (vm._config.xAxis.scale == 'linear') {
          if (d[vm._config.x] > 0) {
            value = vm._scales.x(0);
          }
        }
        return value;
      })
      .attr('y', function (d) {
        var value =  vm._scales.y(d[vm._config.y]);
        var barH = vm._scales.y.bandwidth ? vm._scales.y.bandwidth() : Math.abs(vm._scales.y(d[vm._config.y]) - vm._scales.y(0));
        if (vm._config.yAxis.scale === 'linear') {
          if (d[vm._config.y] < 0) { 
            value = vm._scales.y(0);
          }
        }
        if (barH < 50) {
          return value - 10;
        }
        return value + 40;
      })
      .attr('transform', function(d) {
        var barW = vm._scales.x.bandwidth ? vm._scales.x.bandwidth() : Math.abs(vm._scales.x(d[vm._config.x]) - vm._scales.x(0));
        if (!isNaN(d[vm._config.y])) {
          return 'translate(' + barW/2 + ', 0)';
        } 
        return 'translate(' + (barW + 30) + ', 0)';
      })
      .text( function(d) {
        if (!isNaN(d[vm._config.y])) {
          return '(' + d.coefficient.toFixed(1) + ')';
        } 
        return '(' + d.coefficient.toFixed(1) + ')';
      });
  }

  Bars.draw = function () {
    var vm = this;

    if (vm._config.hasOwnProperty('groupBy')) {
      if (vm._config.hasOwnProperty('x')) vm._drawGroupByXAxis();
      if (vm._config.hasOwnProperty('y')) vm._drawGroupByYAxis();
      return vm;
    }

    if (vm._config.hasOwnProperty('stackBy')) {
      if (vm._config.hasOwnProperty('x')) vm._drawStackByXAxis();
      if (vm._config.hasOwnProperty('y')) vm._drawStackByYAxis();
      return vm;
    }

    vm.chart.svg().call(vm._tip);

    vm.chart.svg().selectAll('.bar')
      .data(vm._data)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('id', function (d, i) {
        var id = 'bars-' + i;
        if (vm._config.id) {
          id = 'bars-' + d[vm._config.id];
        }
        return id;
      })
      .attr('x', function (d) {
        var value = vm._scales.x(d[vm._config.x]);
        if (vm._config.xAxis.scale == 'linear') {
          if (d[vm._config.x] > 0) {
            value = vm._scales.x(0);
          }
        }
        return value;
      })
      .attr('y', function (d) {
        var value =  vm._scales.y(d[vm._config.y]);
        if (vm._config.yAxis.scale === 'linear') {
          if (d[vm._config.y] < 0) { 
            value = vm._scales.y(0);
          }
        }
        return value;
      })
      .attr('width', function (d) {
        return vm._scales.x.bandwidth ? vm._scales.x.bandwidth() : Math.abs(vm._scales.x(d[vm._config.x]) - vm._scales.x(0));
      })
      .attr('height', function (d) {
        return vm._scales.y.bandwidth ? vm._scales.y.bandwidth() : Math.abs(vm._scales.y(d[vm._config.y]) - vm._scales.y(0));
      })
      .attr('fill', function (d) {
        return vm._scales.color !== false ? vm._scales.color(d[vm._config.fill]) : vm._getQuantileColor(d[vm._config.fill], 'default');
      })
      .style('opacity', 0.9)
      .on('mouseover', function (d, i) {
        if (vm._config.hasOwnProperty('quantiles') && vm._config.quantiles.hasOwnProperty('colorsOnHover')) { //OnHover colors
          d3.select(this).attr('fill', function (d) {
            return vm._getQuantileColor(d[vm._config.fill], 'onHover');
          });
        }
        vm._tip.show(d, d3.select(this).node());

        if (vm._config.hasOwnProperty('onmouseover')) { //External function call, must be after all the internal code; allowing the user to overide 
          vm._config.onmouseover.call(this, d, i);
        }

      })
      .on('mouseout', function (d, i) {
        if (vm._config.hasOwnProperty('quantiles') && vm._config.quantiles.hasOwnProperty('colorsOnHover')) { //OnHover reset default color
          d3.select(this).attr('fill', function (d) {
            return vm._getQuantileColor(d[vm._config.fill], 'default');
          });
        }
        vm._tip.hide();

        if (vm._config.hasOwnProperty('onmouseout')) { //External function call, must be after all the internal code; allowing the user to overide 
          vm._config.onmouseout.call(this, d, i);
        }
      })
      .on('click', function (d, i) {
        if (vm._config.hasOwnProperty('click')) {
          vm._config.onclick.call(this, d, i);
        }
      });

      Bars.drawLabels();

    return vm;
  };

  /** 
   * Draw bars grouped by 
   */

  Bars.drawGroupLabels = function () {
    var vm = this;

    var groupLabels = vm.chart.svg().selectAll('.dbox-label')
      .data(vm._data);

    vm._config.groupBy.forEach(function(group, index) {
      groupLabels.enter().append('text')
        .attr('class', 'dbox-label')
        .attr('transform', function(d) {
          if(vm._config.x) {
            if (Math.abs(vm._scales.y(d[group]) - vm._scales.y(0)) < 50) {
              return 'translate(' + ((vm._scales.x(d[vm._config.x]) + 30) + (vm._scales.groupBy.bandwidth() * index)) + ',' + (vm._scales.y(d[group]) - 20) + ')';
            }
            return 'translate(' + ((vm._scales.x(d[vm._config.x]) + 30) + (vm._scales.groupBy.bandwidth() * index)) + ',' + (vm._scales.y(d[group]) + 20) + ')';
          } else {
            return 'translate(' + ((vm._scales.x(d[group]) + 46)) + ',' +  ((vm._scales.y(d[vm._config.y]) + 15) + (vm._scales.groupBy.bandwidth() * index)) + ')';
          }
        })
        .text( function(d) {
          return d[group] ? vm.utils.format(d[group], 1) : '';
        });

      groupLabels.enter().append('text')
        .attr('class', 'dbox-label-coefficient')
        .attr('transform', function(d) {
          if(vm._config.x) {
            if (Math.abs(vm._scales.y(d[group]) - vm._scales.y(0)) < 50) {
              return 'translate(' + ((vm._scales.x(d[vm._config.x]) + 30) + (vm._scales.groupBy.bandwidth() * index)) + ',' + (vm._scales.y(d[group])) + ')';
            }
            return 'translate(' + ((vm._scales.x(d[vm._config.x]) + 30) + (vm._scales.groupBy.bandwidth() * index)) + ',' + (vm._scales.y(d[group]) + 40 ) + ')';
          } else {
            return 'translate(' + ((vm._scales.x(d[group]) + 46)) + ',' +  ((vm._scales.y(d[vm._config.y]) + 30) + (vm._scales.groupBy.bandwidth() * index)) + ')';
          }
        })
        .text( function(d) {
          return d[group + 'coefficient'] ? '(' + d[group + 'coefficient'].toFixed(1) + ')' : '';
        });
    });
  }

  Bars._drawGroupByXAxis = function () {
    var vm = this;
    console.log('_drawGroupByXAxis');
    vm._tip.html(vm._config.tip || function (d) {
      let html =  d.key + '<br>';
      if (d.axis !== d.key) {
        html += d.axis + '<br>';
      }
      html += vm.utils.format(d.value, 1);
      return html;
    });

    vm.chart.svg().call(vm._tip);

    vm.chart.svg().append('g')
      .selectAll('g')
      .data(vm._data)
      .enter().append('g')
      .attr('transform', function (d) {
        return 'translate(' + vm._scales.x(d[vm._config.x]) + ',0)';
      })
      .selectAll('rect')
      .data(function (d) {
        return vm._config.groupBy.map(function (key) {
          return {
            key: key,
            value: d[key],
            axis: d[vm._config.x]
          };
        });
      })
      .enter().append('rect')
      .attr('x', function (d) {
        return vm._scales.groupBy(d.key);
      })
      .attr('y', function (d) {
        if (d.value > 0) {
          return vm._scales.y(d.value);
        } else {
          return vm._scales.y(0);
        }
      })
      .attr('width', vm._scales.groupBy.bandwidth())
      .attr('height', function (d) {
        return Math.abs(vm._scales.y(d.value) - vm._scales.y(0));
      })
      .attr('fill', function (d) {
        return vm._scales.color(d.key);
      })
      .on('mouseover', function (d, i) {
        if (vm._config.hasOwnProperty('quantiles') && vm._config.quantiles.hasOwnProperty('colorsOnHover')) { //OnHover colors
          d3.select(this).attr('fill', function (d) {
            return vm._getQuantileColor(d[vm._config.fill], 'onHover');
          });
        }
        vm._tip.show(d, d3.select(this).node());

        if (vm._config.hasOwnProperty('onmouseover')) {
          //External function call. It must be after all the internal code; allowing the user to overide 
          vm._config.onmouseover.call(this, d, i);
        }

      })
      .on('mouseout', function (d, i) {
        if (vm._config.hasOwnProperty('quantiles') && vm._config.quantiles.hasOwnProperty('colorsOnHover')) { // OnHover colors
          d3.select(this).attr('fill', function (d) {
            return vm._getQuantileColor(d[vm._config.fill], 'default');
          });
        }
        vm._tip.hide();

        if (vm._config.hasOwnProperty('onmouseout')) { // External function call, must be after all the internal code; allowing the user to overide 
          vm._config.onmouseout.call(this, d, i);
        }
      })
      .on('click', function (d, i) {
        if (vm._config.hasOwnProperty('click')) {
          vm._config.onclick.call(this, d, i);
        }
      });

      Bars.drawGroupLabels();
  };

  Bars._drawGroupByYAxis = function () {
    var vm = this;
    console.log('_drawGroupByYAxis');
    vm._tip.html(vm._config.tip || function (d) {
      let html = d.key + '<br>';
      if (d.axis !== d.key) {
        html += d.axis + '<br>';
      }
      html += vm.utils.format(d.value, 1);
      return html;
    });

    vm.chart.svg().call(vm._tip);

    vm.chart.svg().append('g')
      .selectAll('g')
      .data(vm._data)
      .enter().append('g')
      .attr('transform', function (d) {
        return 'translate(0,' + vm._scales.y(d[vm._config.y]) + ' )';
      })
      .selectAll('rect')
      .data(function (d) {
        return vm._config.groupBy.map(function (key) {
          return {
            key: key,
            value: d[key],
            axis: d[vm._config.y]
          };
        });
      })
      .enter().append('rect')
      .attr('y', function (d) {
        return vm._scales.groupBy(d.key);
      })
      .attr('x', function(d) {
        if (d < 0) {
          return vm._scales.x(d.value);
        } else {
          return vm._scales.x(0);
        }
      })
      .attr('width', function (d) {
        return Math.abs(vm._scales.x(d.value) - vm._scales.x(0));
      })
      .attr('height', vm._scales.groupBy.bandwidth())
      .attr('fill', function (d) {
        return vm._scales.color(d.key);
      })
      .on('mouseover', function (d, i) {
        if (vm._config.hasOwnProperty('quantiles') && vm._config.quantiles.hasOwnProperty('colorsOnHover')) { //OnHover colors
          d3.select(this).attr('fill', function (d) {
            return vm._getQuantileColor(d[vm._config.fill], 'onHover');
          });
        }
        vm._tip.show(d, d3.select(this).node());

        if (vm._config.hasOwnProperty('onmouseover')) {
          //External function call. It must be after all the internal code; allowing the user to overide 
          vm._config.onmouseover.call(this, d, i);
        }

      })
      .on('mouseout', function (d, i) {
        if (vm._config.hasOwnProperty('quantiles') && vm._config.quantiles.hasOwnProperty('colorsOnHover')) { //OnHover reset default color
          d3.select(this).attr('fill', function (d) {
            return vm._getQuantileColor(d[vm._config.fill], 'default');
          });
        }
        vm._tip.hide();

        if (vm._config.hasOwnProperty('onmouseout')) { //External function call, must be after all the internal code; allowing the user to overide 
          vm._config.onmouseout.call(this, d, i);
        }
      })
      .on('click', function (d, i) {
        if (vm._config.hasOwnProperty('click')) {
          vm._config.onclick.call(this, d, i);
        }
      });

      Bars.drawGroupLabels();
  };

  Bars.drawStackLabels = function () {
    var vm = this;

    vm.chart.svg().selectAll('.division').each(function(dat, index) {
      d3.select(this).selectAll('.dbox-label').data(dat).enter().append('text')
        .attr('class', 'dbox-label')
        .attr('transform', function(d) {
          if(vm._config.x) {
            return 'translate(' + (vm._scales.x(d.data[vm._config.x]) + 50) + ',' + (vm._scales.y(d[1]) + 20) + ')';
          }
          return 'translate(' + (vm._scales.x(d[1]) - 60) + ',' + (vm._scales.y(d.data[vm._config.y]) + 30) + ')';
        })
        .text( function(d) {
          return d.data[dat.key] ? vm.utils.format(d.data[dat.key], 1) : '';
        });

      d3.select(this).selectAll('.dbox-label-coefficient').data(dat).enter().append('text')
        .attr('class', 'dbox-label-coefficient')
        .attr('transform', function(d) {
          if(vm._config.x) {
            return 'translate(' + (vm._scales.x(d.data[vm._config.x]) + 50) + ',' + (vm._scales.y(d[1]) + 40) + ')';
          }
          return 'translate(' + (vm._scales.x(d[1]) - 60) + ',' + (vm._scales.y(d.data[vm._config.y]) + 50) + ')';
        })
        .text( function(d) {
          return d.data[dat.key + 'coefficient'] ? '(' + d.data[dat.key + 'coefficient'].toFixed(1) + ')' : '';
        });
    });

  }

  Bars._drawStackByXAxis = function () {
    var vm = this;
    console.log('_drawStackByXAxis');
    vm._tip.html(vm._config.tip || function (d) {
      var html = '';
      for (var k in d.data) {
        if ((d[1] - d[0]).toFixed(12) === Number(d.data[k]).toFixed(12)) {
          html += k + '<br>';
        }
      }
      html += d.data[vm._config.x];
      return html + '<br>' + vm.utils.format((d[1] - d[0]), 1);
    });

    vm.chart.svg().call(vm._tip);

    vm.chart.svg().append('g')
      .selectAll('g')
      .data(vm._data)
      .enter().append('g')
      .attr('class', 'division')
      .attr('fill', function (d) {
        return vm._scales.color(d.key);
      })
      //.attr('transform', function(d) { return 'translate(0,'+ vm._scales.y(d[vm._config.y]) +' )'; })
      .selectAll('rect')
      .data(function (d) {
        return d;
      })
      .enter().append('rect')
      .attr('y', function (d) {
        return vm._scales.y(d[1]);
      })
      .attr('x', function (d) {
        return vm._scales.x(d.data[vm._config.x]);
      })
      .attr('width', function () {
        return vm._scales.x.bandwidth();
      })
      .attr('height', function (d) {
        return vm._scales.y(d[0]) - vm._scales.y(d[1]);
      })
      .on('mouseover', function (d, i) {
        if (vm._config.hasOwnProperty('quantiles') && vm._config.quantiles.hasOwnProperty('colorsOnHover')) { //OnHover colors
          d3.select(this).attr('fill', function (d) {
            return vm._getQuantileColor(d[vm._config.fill], 'onHover');
          });
        }
        vm._tip.show(d, d3.select(this).node());

        if (vm._config.hasOwnProperty('onmouseover')) {
          //External function call. It must be after all the internal code; allowing the user to overide 
          vm._config.onmouseover.call(this, d, i);
        }

      })
      .on('mouseout', function (d, i) {
        if (vm._config.hasOwnProperty('quantiles') && vm._config.quantiles.hasOwnProperty('colorsOnHover')) { //OnHover reset default color
          d3.select(this).attr('fill', function (d) {
            return vm._getQuantileColor(d[vm._config.fill], 'default');
          });
        }
        vm._tip.hide();

        if (vm._config.hasOwnProperty('onmouseout')) { //External function call, must be after all the internal code; allowing the user to overide 
          vm._config.onmouseout.call(this, d, i);
        }
      })
      .on('click', function (d, i) {
        if (vm._config.hasOwnProperty('click')) {
          vm._config.onclick.call(this, d, i);
        }
      });

      Bars.drawStackLabels();
  };

  Bars._drawStackByYAxis = function () {
    var vm = this;
    console.log('_drawStackByYAxis');
    vm._tip.html(vm._config.tip || function (d) {
      var html = '';
      for (var k in d.data) {
        if ((d[1] - d[0]).toFixed(12) === Number(d.data[k]).toFixed(12)) {
          html += k + '<br>';
        }
      }
      html += d.data[vm._config.y];
      return html + '<br>' + vm.utils.format((d[1] - d[0]), 1);
    });

    vm.chart.svg().call(vm._tip);

    vm.chart.svg().append('g')
      .selectAll('g')
      .data(vm._data)
      .enter().append('g')
      .attr('class', 'division')
      .attr('fill', function (d) {
        return vm._scales.color(d.key);
      })
      .selectAll('rect')
      .data(function (d) {
        return d;
      })
      .enter().append('rect')
      .attr('y', function (d) {
        return vm._scales.y(d.data[vm._config.y]);
      })
      .attr('x', function (d) {
        return vm._scales.x(d[0]);
      })
      .attr('height', function () {
        return vm._scales.y.bandwidth();
      })
      .attr('width', function (d) {
        return vm._scales.x(d[1]) - vm._scales.x(d[0]);
      })
      .on('mouseover', function (d, i) {
        if (vm._config.hasOwnProperty('quantiles') && vm._config.quantiles.hasOwnProperty('colorsOnHover')) { //OnHover colors
          d3.select(this).attr('fill', function (d) {
            return vm._getQuantileColor(d[vm._config.fill], 'onHover');
          });
        }
        vm._tip.show(d, d3.select(this).node());

        if (vm._config.hasOwnProperty('onmouseover')) {
          //External function call. It must be after all the internal code; allowing the user to overide 
          vm._config.onmouseover.call(this, d, i);
        }

      })
      .on('mouseout', function (d, i) {
        if (vm._config.hasOwnProperty('quantiles') && vm._config.quantiles.hasOwnProperty('colorsOnHover')) { //OnHover reset default color
          d3.select(this).attr('fill', function (d) {
            return vm._getQuantileColor(d[vm._config.fill], 'default');
          });
        }
        vm._tip.hide();

        if (vm._config.hasOwnProperty('onmouseout')) { //External function call, must be after all the internal code; allowing the user to overide 
          vm._config.onmouseout.call(this, d, i);
        }
      })
      .on('click', function (d, i) {
        if (vm._config.hasOwnProperty('click')) {
          vm._config.onclick.call(this, d, i);
        }
      });

      Bars.drawStackLabels();
  };

  Bars._setQuantile = function (data) {
    var vm = this;
    var values = [];
    var quantile = [];

    if (vm._config.quantiles && vm._config.quantiles.predefinedQuantiles &&
      vm._config.quantiles.predefinedQuantiles.length > 0) {
      return vm._config.quantiles.predefinedQuantiles;
    }

    data.forEach(function (d) {
      values.push(+d[vm._config.fill]);
    });

    values.sort(d3.ascending);

    //@TODO use quantile scale instead of manual calculations 
    if (vm._config && vm._config.quantiles && vm._config.quantiles.buckets) {

      if (vm._config.quantiles.ignoreZeros === true) {
        var aux = _.dropWhile(values, function (o) {
          return o <= 0;
        });
        //aux.unshift(values[0]);  

        quantile.push(values[0]);
        quantile.push(0);

        for (var i = 1; i <= vm._config.quantiles.buckets - 1; i++) {
          quantile.push(d3.quantile(aux, i * 1 / (vm._config.quantiles.buckets - 1)));
        }

      } else {
        quantile.push(d3.quantile(values, 0));
        for (var j = 1; j <= vm._config.quantiles.buckets; j++) {
          quantile.push(d3.quantile(values, j * 1 / vm._config.quantiles.buckets));
        }
      }

    } else {
      quantile = [d3.quantile(values, 0), d3.quantile(values, 0.2), d3.quantile(values, 0.4), d3.quantile(values, 0.6), d3.quantile(values, 0.8), d3.quantile(values, 1)];
    }

    //@TODO - VALIDATE WHEN ZEROS NEED TO BE PUT ON QUANTILE 1 AND RECALCULATE NON ZERO VALUES INTO THE REST OF THE BUCKETS
    if (vm._config.quantiles && vm._config.quantiles.buckets && vm._config.quantiles.buckets === 5) {

      if (quantile[1] === quantile[2] && quantile[2] === quantile[3] && quantile[3] === quantile[4] && quantile[4] === quantile[5]) {
        quantile = [d3.quantile(values, 0), d3.quantile(values, 0.2)];
      }
    }

    return quantile;
  };

  Bars._getQuantileColor = function (d, type) {
    var vm = this;
    var total = parseFloat(d);

    //@TODO use quantile scale instead of manual calculations 
    if (vm._config && vm._config.bars.quantiles && vm._config.bars.quantiles.colors) {
      if (vm._quantiles.length > 2) {

        if (vm._config && vm._config.bars.min !== undefined && vm._config.bars.max !== undefined) {
          if (total < vm._config.bars.min || total > vm._config.bars.max) {
            return vm._config.bars.quantiles.outOfRangeColor;
          }
        } else {
          if (total < vm._minMax[0] || total > vm._minMax[1]) {
            return vm._config.bars.quantiles.outOfRangeColor;
          }
        }

        if (type == 'default') {
          if (total <= vm._quantiles[1]) {
            return vm._config.bars.quantiles.colors[0]; //'#f7c7c5';
          } else if (total <= vm._quantiles[2]) {
            return vm._config.bars.quantiles.colors[1]; //'#e65158';
          } else if (total <= vm._quantiles[3]) {
            return vm._config.bars.quantiles.colors[2]; //'#c20216';
          } else if (total <= vm._quantiles[4]) {
            return vm._config.quantiles.colors[3]; //'#750000';
          } else if (total <= vm._quantiles[5]) {
            return vm._config.quantiles.colors[4]; //'#480000';
          }
        }

        if (type == 'onHover' && vm._config.hasOwnProperty('quantiles') && vm._config.quantiles.hasOwnProperty('colorsOnHover')) {
          if (total <= vm._quantiles[1]) {
            return vm._config.quantiles.colorsOnHover[0]; //'#f7c7c5';
          } else if (total <= vm._quantiles[2]) {
            return vm._config.quantiles.colorsOnHover[1]; //'#e65158';
          } else if (total <= vm._quantiles[3]) {
            return vm._config.quantiles.colorsOnHover[2]; //'#c20216';
          } else if (total <= vm._quantiles[4]) {
            return vm._config.quantiles.colorsOnHover[3]; //'#750000';
          } else if (total <= vm._quantiles[5]) {
            return vm._config.quantiles.colorsOnHover[4]; //'#480000';
          }
        }

      }
    }

    if (vm._quantiles.length == 2) {
      /*if(total === 0 ){
        return d4theme.colors.quantiles[0];//return '#fff';
      }else if(total <= vm._quantiles[1]){
        return d4theme.colors.quantiles[1];//return '#f7c7c5';
      }*/
      if (total <= vm._quantiles[1]) {
        return vm._config.quantiles.colors[0]; //'#f7c7c5';
      }
    }

  };

  Bars.init(config);
  return Bars;
}
