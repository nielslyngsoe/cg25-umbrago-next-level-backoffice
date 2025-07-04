import { UmbControllerBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UMB_CONTENT_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/content";
import {
  UMB_VALIDATION_CONTEXT,
  UmbDataPathPropertyValueQuery,
  type UmbValidator,
} from "@umbraco-cms/backoffice/validation";
import type { UmbVariantId } from "@umbraco-cms/backoffice/variant";

// The Example Workspace Context Controller:
export class CustomValidationValidator
  extends UmbControllerBase
  implements UmbValidator
{
  //
  #validationContext?: typeof UMB_VALIDATION_CONTEXT.TYPE;
  #workspaceContext?: typeof UMB_CONTENT_WORKSPACE_CONTEXT.TYPE;

  #msgKey: string;
  #propertyAlias: string;
  #variantId?: UmbVariantId;
  #dataPath: string;
  #isValid: boolean = false;
  #value?: string;

  constructor(
    host: UmbControllerHost,
    propertyAlias: string,
    variantId?: UmbVariantId
  ) {
    super(host);
    this.#propertyAlias = propertyAlias;
    this.#variantId = variantId;

    this.#msgKey = "custom_word_count_" + this.#variantId?.toString();

    this.#dataPath = `$.values[${UmbDataPathPropertyValueQuery({
      alias: this.#propertyAlias,
      culture: this.#variantId?.culture ?? null,
      segment: this.#variantId?.segment ?? null,
    })}].value`;

    this.consumeContext(UMB_VALIDATION_CONTEXT, (context) => {
      this.#validationContext = context;
      this.#checkValidation();
    });

    this.consumeContext(UMB_CONTENT_WORKSPACE_CONTEXT, async (context) => {
      this.#workspaceContext = context;
      this.observe(
        await context?.propertyValueByAlias<string>(
          propertyAlias,
          this.#variantId
        ),
        (value) => {
          this.#value = value;
          this.#checkValidation();
        }
      );
    });
  }

  #checkValidation() {
    // Check value for validation:
    const words =
      this.#value?.split(/\s+/).filter((x) => x.length > 0).length ?? 0;
    if (words > 10) {
      this.#isValid = false;
    } else {
      this.#isValid = true;
    }

    // Update validation message:
    if (this.#validationContext && this.#workspaceContext) {
      if (this.#isValid) {
        this.#validationContext.messages.removeMessageByKey(this.#msgKey);
      } else {
        this.#validationContext.messages.addMessage(
          "custom",
          this.#dataPath,
          `Must be less than <b>10 words</b>, exceeded by ${words - 10} words.`,
          this.#msgKey
        );
      }
    }
  }

  async validate(): Promise<void> {
    // Validate is called when the validation state of this validator is asked to be fully resolved. Like when user clicks Save & Publish.
    // If you need to ask the server then it could be done here, instead of asking the server each time the value changes.
    // In this particular example we do not need to do anything, because our validation is represented via a message that we always set no matter the user interaction.
    // If we did not like to only to check the Validation State when absolute needed then this method must be implemented.
  }

  get isValid(): boolean {
    return this.#isValid;
  }

  reset(): void {
    this.#isValid = false;
  }

  /**
   * Focus the first invalid element.
   */
  focusFirstInvalidElement(): void {
    alert(
      "custom validation is invalid, you should implement a feature to focus the problematic element"
    );
  }

  override destroy(): void {
    this.#validationContext = undefined;
    this.#workspaceContext = undefined;
    this.#value = undefined;
    super.destroy();
  }
}

// Declare a api export, so Extension Registry can initialize this class:
export const api = CustomValidationValidator;
