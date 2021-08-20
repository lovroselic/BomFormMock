/*jshint -W097 */
/*jshint -W117 */
"use strict";
console.clear();

/**
    simplifications:
        assumed  units, no conversions

*/
/**
 * TODO:
 * if ref by mass, ignore mol
 */

var descriptors = ['Component', 'Ref'];
var inputs = ['mol', 'mass', 'volume'];
var properties = ['MW', 'density', 'assay'];
var headers = [...descriptors, ...inputs, ...properties];

var CALC = {
    ratio(arg){},
    mass(arg) { 
        let value = parseFloat(arg.mol * arg.MW);
        if (Number.isNaN(value)) {
            value = parseFloat(arg.volume * arg.density);
        }
        if (Number.isNaN(value)) return "";
        return value / arg.assay;
    },
    volume(arg) { 
        let value = parseFloat(arg.mass / arg.density);
        if (Number.isNaN(value)) return "";
        return value;
    },
    mol(arg) { 
        let value = parseFloat(arg.mass / arg.MW);
        if (Number.isNaN(value)) return "";
        return value * arg.assay;
    }
};
var APP = {
    TABLE: {
        draw() {
            this.writeHeaders();
            this.writeComponents();
        },
        writeHeaders() {
            let html = "";
            for (let col of headers) {
                html += `<th scope="col">${col}</th>`;
            }
            $("#table > thead > tr").html(html);
        },
        writeComponents() {
            //components
            for (let comp in COMPONENTS) {
                let html = "<tr>";
                // name
                html += `<td>${COMPONENTS[comp].name}</td>`;
                //ref
                html += `<td><input type="radio" name="reference" id="RefComponent${comp}" value = "RefComponent${comp}"></td>`;
                //inputs
                for (let [index, inp] of inputs.entries()) {
                    html += `<td><input class="response" type="text" id = "Component${comp}Input${index}"></td>`;
                }
                //properties
                for (let prop of properties) {
                    let propertyValue = COMPONENTS[comp][prop] || "";
                    html += `<td id = "Component${comp}_${prop}">${propertyValue}</td>`;
                }

                html += "</tr>";
                //insert row
                $("#table > tbody").append(html);
            }
            //sum
            let html = `<tr class="table-dark"><td colspan="2">Sum</td>`;
            for (let [index, inp] of inputs.entries()) {
                html += `<td id = "S${index}"></td>`;
            }
            html += `<td colspan=${properties.length}></td></tr>`;
            $("#table > tbody").append(html);
            $("#table > tbody").append(`<tr class="table-dark"><td colspan=${headers.length}>Products</td></tr>`);
            //products
            for (let comp in PRODUCTS) {
                let html = '<tr>';
                // name
                html += `<td>${PRODUCTS[comp].name}</td>`;
                //ref
                html += `<td><input type="radio" name="reference" id="RefProduct${comp}" value = "RefProduct${comp}"></td>`;
                //inputs
                for (let [index, inp] of inputs.entries()) {
                    html += `<td><input class="response" type="text" id = "Product${comp}Input${index}"></td>`;
                }
                //properties
                for (let prop of properties) {
                    let propertyValue = PRODUCTS[comp][prop] || "";
                    html += `<td id = "Product${comp}_${prop}">${propertyValue}</td>`;
                }

                html += "</tr>";
                //insert row
                $("#table > tbody").append(html);
            }
            // first checked by default
            $("#RefComponent1").prop("checked", true);
        }
    },
    handle() {
        let element = this;
        let value = parseFloat(this.value);
        let id = this.id;
        let R = $('input[name=reference]:checked').val();
        let referenceBy = $('input[name=whichref]:checked').val();
        console.log("handler", id, value, "R", R, referenceBy);
        // all responses need to be processed
        let responses = $(".response");
        var refIndex = inputs.indexOf(referenceBy);
        for (let response of responses) {
            console.log("response.id",response.id);
            if (response.id === id) continue; //this was entered
            let inputIdentifier = parseInt(response.id.substring(response.id.indexOf("Input") + "Input".length), 10);
            //if (referenceBy === "mass" && inputIdentifier === inputs.indexOf("mol")) continue; //
            let ref = `${R.substring(3)}Input${refIndex}`;
            let rowIdentifier = response.id.substring(0, response.id.indexOf("Input"));
            let selected = `${rowIdentifier}Input${refIndex}`;
            console.log("selected, ref", selected, ref);
            let ratio = APP.getRatio(selected, ref);
            //if (Number.isNaN(ratio)) continue; //can't calculate
            let ARG = APP.packArguments(rowIdentifier);
            ARG.ratio = ratio;
            console.log("ratio", ratio);
            let func = CALC[inputs[inputIdentifier]];
            //console.log(".func", func);
            //calc value
            $(`#${response.id}`).val(func.call(null, ARG));
            //
            //break;
        }
        //mass sum
        let massSum = 0;
        for (let component = 1; component <= Object.keys(COMPONENTS).length; component++){
            massSum += parseFloat($(`#Component${component}Input${inputs.indexOf("mass")}`).val()) || 0;
        }
        $(`#S${inputs.indexOf("mass")}`).html(massSum);

        //if reference by mass fill massSum as target value
        if (referenceBy === 'mass'){
            //$("#Product1Input1").val(massSum); //direct, does not scale, refactor!!
            $(`#Product1Input${inputs.indexOf("mass")}`).val(massSum);
        }

    },
    getRatio(selected, ref) {
        return parseFloat($(`#${selected}`).val()) / parseFloat($(`#${ref}`).val());
    },
    packArguments(row){
        let arg = {};
        //inputs
        for (let [index, inp] of inputs.entries()){
            let id = `${row}Input${index}`;
            arg[inp] = parseFloat($(`#${id}`).val());
        }
        //properties
        for (let [index, prop] of properties.entries()){
            let id = `${row}_${prop}`;
            arg[prop] = parseFloat($(`#${id}`).html());
        }
        arg.assay = arg.assay || 1;
        return arg;
    }
};
APP.TABLE.draw();
$(".response").change(APP.handle);