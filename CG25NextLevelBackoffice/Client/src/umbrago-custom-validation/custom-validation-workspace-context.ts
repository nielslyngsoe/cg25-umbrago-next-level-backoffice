import { CustomValidationValidator } from "./custom-validation-validator.js";
import { UmbContextToken } from "@umbraco-cms/backoffice/context-api";
import { UmbContextBase } from "@umbraco-cms/backoffice/class-api";
import type { UmbControllerHost } from "@umbraco-cms/backoffice/controller-api";
import { UMB_CONTENT_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/content";
import { UmbVariantId } from "@umbraco-cms/backoffice/variant";

// Configuration for which property alias to validate:
const MY_CUSTOM_VALIDATION_PROPERTY_ALIAS = "tagline";

// The Validation Workspace Context Controller:
export class CustomValidationWorkspaceContext extends UmbContextBase {
  #validators?: Array<CustomValidationValidator>;

  constructor(host: UmbControllerHost) {
    super(host, EXAMPLE_CUSTOM_VALIDATION_CONTEXT);

    this.consumeContext(UMB_CONTENT_WORKSPACE_CONTEXT, async (context) => {
      // Observe the property type to see if it varies by culture:
      this.observe(
        await context?.structure.propertyStructureByAlias(
          MY_CUSTOM_VALIDATION_PROPERTY_ALIAS
        ),
        (propertyType) => {
          if (!propertyType) {
            this.removeUmbControllerByAlias("observeVariantOptions");
            this.#validators?.forEach((x) => x.destroy());
            return;
          }
          if (propertyType.variesByCulture) {
            // Because this property exists in multiple cultures we should observe cultures an create a custom validator for each culture value:
            this.observe(
              context?.variantOptions,
              (variantOptions) => {
                // clean up old validators:
                this.#validators?.forEach((x) => x.destroy());

                this.#validators = variantOptions?.map((option) => {
                  return new CustomValidationValidator(
                    this,
                    MY_CUSTOM_VALIDATION_PROPERTY_ALIAS,
                    UmbVariantId.Create(option)
                  );
                });
              },
              "observeVariantOptions"
            );
          } else {
            // Not varying by culture, so we can just create a single validator for the invariant value:
            this.#validators?.forEach((x) => x.destroy());
            this.#validators = [
              new CustomValidationValidator(
                this,
                MY_CUSTOM_VALIDATION_PROPERTY_ALIAS
              ),
            ];
          }
        },
        "observePropertyType"
      );
    });
  }
}

// Declare a api export, so Extension Registry can initialize this class:
export const api = CustomValidationWorkspaceContext;

// Declare a Context Token, to other can request the context and to ensure typings.
export const EXAMPLE_CUSTOM_VALIDATION_CONTEXT =
  new UmbContextToken<CustomValidationWorkspaceContext>(
    "UmbWorkspaceContext",
    "example.workspaceContext.counter"
  );
