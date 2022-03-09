import { FileBlockProps, getLanguageFromFilename } from "@githubnext/utils";
import { useCallback } from "react";

import JavaScriptDocumentation from "./languages/javascript";

import { Box, Heading, Text, Token } from '@primer/react'
import { ThemeProvider, theme } from '@primer/react'

import "./index.css"

export default function (props: FileBlockProps) {
  const { context } = props;

  const language = Boolean(context.path)
    ? getLanguageFromFilename(context.path)
    : "N/A";

  const renderContent = useCallback(() => {
    switch (language) {
      case "JavaScript":
        return <JavaScriptDocumentation {...props} />;
      default:
        return <Text>Language not supported: {language}</Text>;
    }
  }, [ language ]);

  return (
    <ThemeProvider theme={theme}>
      <Box m={4}>
        <Box sx={{ display: "flex" }}>
          <Heading as="h3" sx={{ flex: 1 }}>{context.path}</Heading>
          <Token text={language} />
        </Box>
        {renderContent()}
      </Box>
    </ThemeProvider>
  );
}
