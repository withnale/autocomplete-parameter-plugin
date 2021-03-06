var $ = require('jqueryui-detached').getJQueryUI();
var jenkinsJSModules = require('jenkins-js-modules');
var parameterGroovyEditorIdCounter = 0;

// The Jenkins 'ace-editor:ace-editor-122' plugin doesn't support a synchronous 
// require option. This is because of how the ACE editor is written. So, we need
// to use lower level jenkins-js-modules async 'import' to get a handle on a 
// specific version of ACE, from which we create an editor instance for workflow. 
jenkinsJSModules.import('ace-editor:ace-editor-122')
    .onFulfilled(function (acePack) {
        
        $('.parameter-groovy-editor-wrapper').each(function() {
            initEditor($(this));        
        });
        
        function initEditor(wrapper) {
            var textarea = $('textarea', wrapper);
            var aceContainer = $('.editor', wrapper);
            
            $('.textarea-handle', wrapper).remove();
            
            // The ACE Editor js expects the container element to have an id.
            // We generate one and add it.
            parameterGroovyEditorIdCounter++;
            var editorId = 'parameter-groovy-wrapper-' + parameterGroovyEditorIdCounter;
            aceContainer.attr('id', editorId);
            
            // The 'ace-editor:ace-editor-122' plugin supplies an "ACEPack" object.
            // ACEPack understands the hardwired async nature of the ACE impl and so
            // provides some async ACE script loading functions.
            
            acePack.edit(editorId, function() {
                var ace = acePack.ace;
                var editor = this.editor;
                
                // Attach the ACE editor instance to the element. Useful for testing.
                var $wfEditor = $('#' + editorId);
                $wfEditor.get(0).aceEditor = editor;
    
    
                acePack.addScript('ext-language_tools.js', function() {
                    ace.require("ace/ext/language_tools");
                    
                    editor.$blockScrolling = Infinity;
                    editor.session.setMode("ace/mode/groovy");
                    editor.setTheme("ace/theme/tomorrow");
                    editor.setAutoScrollEditorIntoView(true);
                    editor.setOption("minLines", 20);
                    // enable autocompletion 
                    editor.setOptions({
                        enableBasicAutocompletion: true,
                        enableLiveAutocompletion: false,
                        enableSnippets: false
                    });
    
                    editor.setValue(textarea.val(), 1);
                    editor.getSession().on('change', function() {
                        textarea.val(editor.getValue());
                    });
    
                    editor.on('blur', function() {
                        editor.session.clearAnnotations();
                        var url = textarea.attr("checkUrl") + 'Compile';
    
                        new Ajax.Request(url, { // jshint ignore:line
                            method: textarea.attr('checkMethod') || 'POST',
                            parameters: {
                                value: editor.getValue()
                            },
                            onSuccess : function(data) {
                                var json = data.responseJSON;
                                var annotations = [];
                                if (json.status && json.status === 'success') {
                                    // Fire script approval check - only if the script is syntactically correct
                                    textarea.trigger('change');
                                    return;
                                } else {
                                    // Syntax errors
                                    $.each(json, function(i, value) {
                                        annotations.push({
                                            row: value.line - 1,
                                            column: value.column,
                                            text: value.message,
                                            type: 'error'
                                        });
                                    });
                                }
                                editor.getSession().setAnnotations(annotations);
                            }
                        });
                    });

                });
    
                // Make the editor resizable using jQuery UI resizable (http://api.jqueryui.com/resizable).
                // ACE Editor doesn't have this as a config option.
                $wfEditor.wrap('<div class="jquery-ui-1"></div>');
                $wfEditor.resizable({
                    handles: "s", // Only allow vertical resize off the bottom/south border
                    resize: function() {
                        editor.resize();
                    }
                });
                // Make the bottom border a bit thicker as a visual cue.
                // May not be enough for some people's taste.
                $wfEditor.css('border-bottom-width', '0.4em');
            });
            
            wrapper.show();
            textarea.hide();
        }
    });
