/**
 *  @license
 *    Copyright 2018 Brigham Young University
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 **/
'use strict'
const Enforcer          = require('openapi-enforcer');
const expect            = require('chai').expect;
const RefParser         = require('json-schema-ref-parser');
const validateExamples  = require('../bin/validate-examples');

describe('validate examples', () => {

    const valid = {
        "swagger": "2.0",
        "info": {
            "title": "Examples",
            "version": "1.0.0"
        },
        "paths": {
            "/object": {
                "get": {
                    "responses": {
                        "200": {
                            "description": "All data types",
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "integer": {
                                        "type": "integer"
                                    },
                                    "number": {
                                        "type": "number"
                                    },
                                    "string": {
                                        "type": "string"
                                    },
                                    "byte": {
                                        "type": "string",
                                        "format": "byte"
                                    },
                                    "binary": {
                                        "type": "string",
                                        "format": "binary"
                                    },
                                    "boolean": {
                                        "type": "boolean"
                                    },
                                    "date": {
                                        "type": "string",
                                        "format": "date"
                                    },
                                    "dateTime": {
                                        "type": "string",
                                        "format": "date-time"
                                    },
                                    "password": {
                                        "type": "string",
                                        "format": "password"
                                    }
                                }
                            },
                            "examples": {
                                "application/json": {
                                    "integer": 1,
                                    "number": 1.2,
                                    "string": "hello",
                                    "byte": "aGVsbG8=",
                                    "binary": "01100001",
                                    "boolean": true,
                                    "date": "2000-01-01",
                                    "dateTime": "2000-01-01T01:02:03.456Z",
                                    "password": "plain text"
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    it('valid-examples', () => {
        return RefParser.dereference(valid)
            .then(schema => {
                const enforcer = new Enforcer(schema);
                const errors = validateExamples(enforcer, schema);
                expect(errors.length).to.equal(0);
            });

    });

});
