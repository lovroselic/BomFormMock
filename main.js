/*jshint -W097 */
/*jshint -W117 */
"use strict";
console.clear();

/**
    simplifications:
        assumed  units

*/
/**
 * TODO:

 */

var descriptors = ['Component', 'Ref'];
//var inputs = ['factor', 'mol', 'mass', 'volume'];
var inputs = ['mol', 'mass', 'volume', 'factor'];
var properties = ['MW', 'density', 'assay'];
var headers = [...descriptors, ...inputs, ...properties];

var CALC = {
    factor(arg) {
        if (arg.referenceBy === 'mass') return "";
        let value;
        if (arg.selectedFactor === arg.referenceFactor) {
            value = APP.STACK.REFERENCE_FACTOR;
        } else {
            value = arg.selectedFactor / arg.referenceFactor;
        }
        if (Number.isNaN(value)) return "";
        return value.toFixed(2);
    },
    mass(arg) {
        let value = Number.parseFloat(arg.mol * arg.MW);
        if (Number.isNaN(value)) {
            value = Number.parseFloat(arg.volume * arg.density);
        }
        if (Number.isNaN(value)) return "";
        return Number(value / arg.assay).toFixed(2);
    },
    volume(arg) {
        let value = Number.parseFloat(arg.mass / arg.density);
        if (Number.isNaN(value)) return "";
        return value.toFixed(2);
    },
    mol(arg) {
        if (arg.referenceBy === 'mass') return "";
        let value = Number.parseFloat(Number.parseFloat(arg.mass) / arg.MW); //coercing "" to NaN
        if (Number.isNaN(value)) {
            if (arg.mol) {
                //mol has been set from factor, but mass == "";
                return arg.mol;
            } else return "";
        }
        return Number(value * arg.assay).toFixed(2);
    }
};
var APP = {
    version: "1.0.1",
    STACK: {
        TARGET: null,
        REFERENCE_FACTOR: 1
    },
    TABLE: {
        draw() {
            console.log(`%cBOMFormMock v${APP.version}`, 'color: green');
            this.writeHeaders();
            this.writeComponents();
            $("#v").html(`v${APP.version} by LS`);
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
                html += `<td><input type="radio" name="reference" id="Ref_Component${comp}" value = "Ref_Component${comp}"></td>`;
                //inputs
                for (let inp of inputs) {
                    html += `<td><input class="response Component${comp} ${inp}" type="text" id = "Component${comp}_${inp}"></td>`;
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
            for (let inp of inputs) {
                html += `<td id = "S_${inp}"></td>`;
            }
            html += `<td colspan=${properties.length}></td></tr>`;
            $("#table > tbody").append(html);
            $("#table > tbody").append(`<tr class="table-dark">
            <td colspan=${headers.length}>Products</td>
            <td>Yield<td>
            </tr>`);
            //products
            for (let comp in PRODUCTS) {
                let html = '<tr>';
                // name
                html += `<td>${PRODUCTS[comp].name}</td>`;
                //ref
                html += `<td><input type="radio" name="reference" id="Ref_Product${comp}" value = "Ref_Product${comp}"></td>`;
                //inputs
                for (let inp of inputs) {
                    html += `<td><input class="response Product${comp} ${inp}" type="text" id = "Product${comp}_${inp}"></td>`;
                }
                //properties
                for (let prop of properties) {
                    let propertyValue = PRODUCTS[comp][prop] || "";
                    html += `<td id = "Product${comp}_${prop}">${propertyValue}</td>`;
                }

                //yield
                html += `<td><input class="yield" type="text" id = "Yield"></td>`;
                //

                html += "</tr>";
                //insert row
                $("#table > tbody").append(html);
            }

            APP.init();
            //mol by default
            $("#ref_mol").prop("checked", true);
        }
    },
    init() {
        // first checked by default
        $("#Ref_Component1").prop("checked", true);
        // first factor 1 by default if mol, otherwise """
        $("#Component1_factor").val(1);
        if ($('input[name=whichref]:checked').val() === 'mass') {
            $("#Component1_factor").val("");
        }
    },
    getReferenceRow() {
        let R = $('input[name=reference]:checked').val();
        R = R.substring(R.indexOf("_") + 1);
        return R;
    },
    handle() {
        console.clear();
        console.log("--");
        let id = this.id;
        let row = id.substring(0, id.indexOf("_"));
        let column = id.substring(id.indexOf("_") + 1);
        let referenceBy = $('input[name=whichref]:checked').val();
        let R = APP.getReferenceRow();

        //if column == factor and refby has no value
        if (column === 'factor' && $(`#${row}_${referenceBy}`).val() === "") {
            if ($(`#${R}_${referenceBy}`).val() !== "") {
                let refValue = $(`#${R}_${referenceBy}`).val() * $(`#${row}_factor`).val() / $(`#${R}_factor`).val();
                $(`#${row}_${referenceBy}`).val(Number(refValue).toFixed(2));
            }
        }

        let rowResponses = $(`.${row}`);

        // calc all in the row
        for (let response of rowResponses) {
            if (response.id === id) continue; //this was entered
            let responseColumn = response.id.substring(id.indexOf("_") + 1);
            let ARG = APP.packArguments(row, R, referenceBy);
            console.log('response.id', response.id, "->", CALC[responseColumn](ARG));
            $(`#${response.id}`).val(CALC[responseColumn](ARG));
        }

        //calc scale factor and scale the row
        let oldFactor;
        if (row !== R) {
            oldFactor = Number.parseFloat($(`#${row}_${referenceBy}`).val()) / Number.parseFloat($(`#${R}_${referenceBy}`).val());
            //oldFactor isNaN only if it has never been set, so:
            if (Number.isNaN(oldFactor)) oldFactor = 1;
        } else {
            // can't calculate old reference factor from changed data;
            oldFactor = APP.STACK.REFERENCE_FACTOR;
        }
        let scaleFactor = Number.parseFloat($(`#${row}_factor`).val()) / oldFactor;
        console.log('oldFactor', oldFactor);
        console.log('scaleFactor', scaleFactor);

        //scale the row
        if (!Number.isNaN(scaleFactor)) {
            for (let inp of inputs) {
                if (inp === 'factor') continue;
                let cellValue = $(`#${row}_${inp}`).val();
                console.log("..scaling row", inp, "->", cellValue, "SCALE->", Number(cellValue * scaleFactor).toFixed(2));
                if (cellValue !== "") {
                    $(`#${row}_${inp}`).val(Number(cellValue * scaleFactor).toFixed(2));
                }

            }
        }

        //if row is Reference, then all the table needs to be recalcd, except Reference row

        if (row === R) {
            console.log("#### RECALC TABLE ####");
            let allResponses = $(".response");
            for (let response of allResponses) {
                if (response.id === id) continue; //this was entered
                let rowIdentifier = response.id.substring(0, response.id.indexOf("_"));
                if (rowIdentifier === R) continue; //skip Reference row
                let targetScaleFactor = Number.parseFloat($(`#${R}_${referenceBy}`).val()) / APP.STACK.TARGET;
                let value = Number.parseFloat($(`#${response.id}`).val());
                value *= targetScaleFactor;
                if (Number.isNaN(value)) {
                    value = "";
                } else {
                    value = Number(value).toFixed(2);
                }
                $(`#${response.id}`).val(value);
            }
        }

        //mass sum
        let massSum = 0;
        for (let component = 1; component <= Object.keys(COMPONENTS).length; component++) {
            massSum += Number.parseFloat($(`#Component${component}_mass`).val()) || 0;
        }
        massSum = massSum.toFixed(2);
        $(`#S_mass`).html(massSum);
        //if reference by mass fill massSum as target value
        if (referenceBy === 'mass') {
            $(`#Product1_mass`).val(massSum);
        }
        APP.storeReferences(R, referenceBy);
    },
    handleReferenceRowChange() {
        let R = APP.getReferenceRow();
        let referenceBy = $('input[name=whichref]:checked').val();
        APP.storeReferences(R, referenceBy);
    },
    handleReferenceTypeChange() {
        let allResponses = $(".response");
        for (let response of allResponses) {
            $(`#${response.id}`).val("");
        }
        APP.init();
    },
    packArguments(row, R, referenceBy) {
        let arg = {};
        //inputs
        for (let inp of inputs) {
            let id = `${row}_${inp}`;
            arg[inp] = Number.parseFloat($(`#${id}`).val());
        }
        //properties
        for (let prop of properties) {
            let id = `${row}_${prop}`;
            arg[prop] = Number.parseFloat($(`#${id}`).html());
        }
        arg.assay = arg.assay || 1;
        arg.referenceFactor = Number.parseFloat($(`#${R}_${referenceBy}`).val());
        arg.selectedFactor = Number.parseFloat($(`#${row}_${referenceBy}`).val());
        arg.referenceBy = referenceBy;
        return arg;
    },
    storeReferences(R, referenceBy) {
        // store target for reference
        APP.STACK.TARGET = Number.parseFloat($(`#${R}_${referenceBy}`).val());
        APP.STACK.REFERENCE_FACTOR = Number.parseFloat($(`#${R}_factor`).val());
    },
};

APP.TABLE.draw();
$('input[type=radio][name=reference]').change(APP.handleReferenceRowChange);
$('input[type=radio][name=whichref]').change(APP.handleReferenceTypeChange);
$(".response").change(APP.handle);