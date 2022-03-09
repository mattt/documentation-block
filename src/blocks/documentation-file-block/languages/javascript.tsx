import { FileBlockProps, getLanguageFromFilename } from "@githubnext/utils";
import { useEffect, useState } from "react";
import TreeSitter from 'web-tree-sitter';
import { marked } from 'marked';
import dompurify from 'dompurify';
const DOMPurify = dompurify(window);

import { Box, Text, Token } from '@primer/react'

// Example: https://github.com/jsdoc/jsdoc/blob/main/packages/jsdoc-parse/lib/ast-node.js
// Example: https://github.com/jsdoc/jsdoc/blob/main/packages/jsdoc-util/lib/bus.js
// Example: https://github.com/Surnet/swagger-jsdoc/blob/master/src/utils.js

export default function (props: FileBlockProps) {
    const { context, content, metadata } = props;

    let [ symbols, setSymbols ] = useState<any[]>([]);

    useEffect(() => {
        (async () => {
            await TreeSitter.init();
            const javascriptParser = new TreeSitter();
            const javascript = await TreeSitter.Language.load('/tree-sitter-javascript.wasm');
            javascriptParser.setLanguage(javascript);

            const declarationQuery = javascript.query(`
                (
                    (comment)+ @comment
                    [
                        (lexical_declaration
                            (variable_declarator 
                            (identifier) @identifier
                            )
                        )
                        (expression_statement
                            (assignment_expression
                                left: (_) @identifier
                            )
                        )
                        (function_declaration
                        name: (_) @identifier
                        )
                    ]+ @declaration
                )
            `);

            const jsdocParser = new TreeSitter();
            const jsdoc = await TreeSitter.Language.load('/tree-sitter-jsdoc.wasm');
            jsdocParser.setLanguage(jsdoc);

            const tree = javascriptParser.parse(content);

            let symbols = [];
            for (const match of declarationQuery.matches(tree.rootNode)) {
                const [ comment, declaration, identifier ] = match.captures;

                let documentation = {}
                if (comment.node.text.match(/^\s*\/\*\*/)) {
                    const innerTree = jsdocParser.parse(comment.node.text);

                    let description = innerTree.rootNode.firstNamedChild?.text || "";
                    description = description.split(/\n/).map((s) => s.replace(/^\s*\*\s*/, "")).join("\n");

                    // FIXME: Fix query to allow for empty descriptions.
                    if (description?.startsWith("@")) {
                        description = "";
                    }

                    const tags = innerTree.rootNode.descendantsOfType("tag").map((node) => {
                        let tag = Object.assign({}, ...node.children.map((child) => ({ [ child.type ]: child.text })));
                        tag.tag_name = (() => {
                            switch (tag.tag_name) {
                                case "@param":
                                    return "Parameter";
                                case "@return":
                                case "@returns":
                                    return "Returns";
                                default:
                                    return tag.tag_name.replace(/^@/, "");
                            }
                        })();
                        tag.description = tag.description?.replace(/^\s*-\s*/, "");
                        return tag;
                    });

                    documentation = {
                        description,
                        tags
                    }
                } else {
                    continue;
                }

                symbols.push({
                    id: `${identifier.node.text}-${declaration.node.id}`,
                    name: identifier.node.text,
                    documentation,
                    location: {
                        start: {
                            line: declaration.node.startPosition.row,
                            column: declaration.node.startPosition.column
                        },
                        end: {
                            line: declaration.node.endPosition.row,
                            column: declaration.node.endPosition.column
                        }
                    },
                    kind: declaration.node.firstChild?.text,
                });
            }

            setSymbols(symbols);
        })();
    }, [ props.content ]);

    return (
        <>
            {symbols.map(symbol => (
                <Box paddingBottom={4} key={symbol.id}>
                    <header>
                        <h4>{symbol.name}</h4>
                    </header>

                    <div className="description"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(symbol.documentation.description)) }}>
                    </div>

                    <table>
                        <tbody>
                            {symbol.documentation.tags.map((tag: any, index: number) => (
                                <tr key={`${index}-${tag.tag_name}`}>
                                    <th>
                                        <Text as="span">
                                            {tag.tag_name}
                                        </Text>
                                    </th>
                                    <td><Token text={tag.type} /></td>
                                    <td>
                                        <Text as="span" color="fg.muted">
                                            {tag.description}
                                        </Text>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Box>
            ))
            }
        </>
    );
}
