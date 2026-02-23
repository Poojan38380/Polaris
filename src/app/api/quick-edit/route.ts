import { z } from "zod";
import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { google } from "@ai-sdk/google";

import { firecrawl } from "@/lib/firecrawl";

const quickEditSchema = z.object({
  editedCode: z
    .string()
    .describe(
      "The edited version of the selected code based on the instruction"
    ),
});

const URL_REGEX = /https?:\/\/[^\s)>\]]+/g;

const QUICK_EDIT_PROMPT = `You are an AI-powered code editing assistant for a code editor.

Your job is to edit the selected code block according to the user's instruction while maintaining code quality, style consistency, and proper syntax.

<context>
<selected_code>
{selectedCode}
</selected_code>
<full_code_context>
{fullCode}
</full_code_context>
{documentation}
</context>

<instruction>
{instruction}
</instruction>

<task>
Your task is to edit the selected_code based on the instruction provided.

Guidelines:
1. Apply the instruction precisely to the selected_code:
   - Make the requested changes accurately
   - Preserve code that should remain unchanged
   - Follow the instruction's intent, not just literal wording

2. Maintain code quality and consistency:
   - Preserve the exact indentation level of the original selected code
   - Match the coding style, naming conventions, and patterns from full_code_context
   - Keep the same code structure and organization unless the instruction requires restructuring
   - Maintain proper syntax and language idioms

3. Use full_code_context for context:
   - Understand how the selected code fits into the larger file
   - Ensure edited code integrates seamlessly with surrounding code
   - Respect existing imports, types, and dependencies
   - Follow patterns and conventions used elsewhere in the file

4. Use documentation when provided:
   - Reference documentation snippets to ensure correctness
   - Follow best practices and patterns from the documentation
   - Apply relevant examples or guidelines from the docs

5. When to return original code:
   - Only return the original code unchanged if the instruction is truly unclear, ambiguous, or cannot be meaningfully applied
   - If the instruction requires clarification but you can make a reasonable interpretation, apply it
   - If the instruction conflicts with code requirements, make the best reasonable edit that satisfies the intent

6. Output requirements:
   - Return ONLY the edited version of the selected code
   - Do NOT include explanations, comments about changes, or meta-commentary
   - Do NOT include markdown code fences, backticks, or formatting
   - Do NOT include the surrounding code from full_code_context
   - Preserve all original comments unless the instruction explicitly asks to modify them
</task>

<output_format>
CRITICAL: Your response must contain ONLY the edited code text, ready for direct replacement.

DO NOT include:
- Markdown code fences (no backticks)
- Explanations, comments about your changes, or prose
- JSON formatting around the code
- Code from full_code_context that wasn't in selected_code
- Any text that describes what you changed

DO include:
- Only the edited version of the selected_code
- Exact same indentation as the original
- All original code that should remain unchanged
- Proper syntax and formatting matching the file's style

If the instruction cannot be applied, return the original selected_code unchanged.
</output_format>`;

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    const { selectedCode, fullCode, instruction } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 400 }
      );
    }

    if (!selectedCode) {
      return NextResponse.json(
        { error: "Selected code is required" },
        { status: 400 }
      );
    }

    if (!instruction) {
      return NextResponse.json(
        { error: "Instruction is required" },
        { status: 400 }
      );
    }

    const urls: string[] = instruction.match(URL_REGEX) || [];
    let documentationContext = "";

    if (urls.length > 0) {
      const scrapedResults = await Promise.all(
        urls.map(async (url) => {
          try {
            const result = await firecrawl.scrape(url, {
              formats: ["markdown"],
            });

            if (result.markdown) {
              return `<doc url="${url}">\n${result.markdown}\n</doc>`;
            }

            return null;
          } catch {
            return null;
          }
        })
      );

      const validResults = scrapedResults.filter(Boolean);

      if (validResults.length > 0) {
        documentationContext = `<documentation>\n${validResults.join("\n\n")}\n</documentation>`;
      }
    }

    const prompt = QUICK_EDIT_PROMPT
      .replace("{selectedCode}", selectedCode)
      .replace("{fullCode}", fullCode || "")
      .replace("{instruction}", instruction)
      .replace("{documentation}", documentationContext);

    const { output } = await generateText({
      model: google("gemini-2.5-flash"),
      output: Output.object({ schema: quickEditSchema }),
      prompt,
    });

    return NextResponse.json({ editedCode: output.editedCode });
  } catch (error) {
    console.error("Edit error:", error);
    return NextResponse.json(
      { error: "Failed to generate edit" },
      { status: 500 }
    );
  }
};