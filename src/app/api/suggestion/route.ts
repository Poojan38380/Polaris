import { generateText, Output } from "ai";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { google } from "@ai-sdk/google";

const suggestionSchema = z.object({
  suggestion: z
    .string()
    .describe(
      "The code to insert at cursor, or empty string if no completion needed"
    ),
});

const SUGGESTION_PROMPT = `You are an AI-powered inline code completion engine for a code editor (similar to GitHub Copilot).

Your job is to predict and suggest the next few characters, tokens, or lines that the developer is likely to type at the cursor position.

<context>
<file_name>{fileName}</file_name>
<line_number>{lineNumber}</line_number>
<previous_lines>
{previousLines}
</previous_lines>
<current_line>{currentLine}</current_line>
<text_before_cursor>{textBeforeCursor}</text_before_cursor>
<text_after_cursor>{textAfterCursor}</text_after_cursor>
<next_lines>
{nextLines}
</next_lines>
<full_code>
{code}
</full_code>
</context>

<task>
Your task is to continue the code exactly at the cursor position (immediately after text_before_cursor).

Use the following context to infer developer intent:
- previous_lines: What was written before the current line
- current_line: The line where the cursor is located
- text_before_cursor: Everything on the current line up to the cursor
- text_after_cursor: Everything on the current line after the cursor
- next_lines: Code that exists below the current line
- full_code: The entire file content for broader context
- file_name: Helps identify the programming language and conventions

Guidelines:
1. ALWAYS try to suggest something useful unless the cursor is in a truly ambiguous position (e.g., empty whitespace with no clear intent).

2. Use next_lines as a CONSTRAINT, not a reason to give up:
   - If next_lines already contains code that continues from the cursor, suggest code that BRIDGES into it without duplication
   - Never emit code that duplicates or contradicts what's in next_lines
   - Look for opportunities to complete partial expressions, parameter lists, or statements that lead naturally into next_lines

3. Prefer SHORT, PRECISE continuations:
   - Complete the current expression, statement, or line
   - Suggest a few tokens to a few lines maximum
   - Avoid generating large code blocks

4. Infer patterns from full_code:
   - Match the coding style (indentation, naming conventions, patterns)
   - Use similar constructs that appear elsewhere in the file
   - Respect the language idioms based on file_name extension

5. Only return an empty string if:
   - The cursor is at the end of a clearly complete top-level statement with no obvious continuation
   - There is truly no signal about what should come next
   - text_after_cursor or next_lines already contain the exact continuation
</task>

<output_format>
CRITICAL: Your response must contain ONLY raw code text suitable for inline insertion.

DO NOT include:
- Markdown code fences (no backticks)
- Explanations, comments, or prose (unless continuing an existing comment)
- JSON formatting around the code
- Any text that restates or modifies previous_lines or next_lines

DO include:
- Only the exact characters/tokens/lines to insert at the cursor
- Proper whitespace and indentation matching the file's style
- Syntactically coherent code that integrates seamlessly

If you determine no suggestion is appropriate, return an empty string.
</output_format>`;

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 },
      );
    }

    const {
      fileName,
      code,
      currentLine,
      previousLines,
      textBeforeCursor,
      textAfterCursor,
      nextLines,
      lineNumber,
    } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "Code is required" },
        { status: 400 }
      );
    }

    const prompt = SUGGESTION_PROMPT
      .replace("{fileName}", fileName)
      .replace("{code}", code)
      .replace("{currentLine}", currentLine)
      .replace("{previousLines}", previousLines || "")
      .replace("{textBeforeCursor}", textBeforeCursor)
      .replace("{textAfterCursor}", textAfterCursor)
      .replace("{nextLines}", nextLines || "")
      .replace("{lineNumber}", lineNumber.toString());

    const { output } = await generateText({
      model: google("gemini-2.5-flash"),
      output: Output.object({ schema: suggestionSchema }),
      prompt,
    });

    return NextResponse.json({ suggestion: output.suggestion })
  } catch (error) {
    console.error("Suggestion error: ", error);
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 },
    );
  }
}