import Handlebars from 'handlebars';
import path from 'path';
import { glob } from 'fast-glob';
import {
  VariableDeclaration,
  FunctionDefinition,
  ImportDirective,
  ASTNode,
  ASTKind,
  ASTReader,
  SourceUnit,
  compileSol,
  ContractDefinition,
  FunctionVisibility,
  TypeName,
  UserDefinedTypeName,
  ArrayTypeName,
  FunctionKind,
  UserDefinedValueTypeDefinition,
} from 'solc-typed-ast';
import { userDefinedTypes, explicitTypes, FullFunctionDefinition, SelectorsMap } from './types';
import { readFileSync } from 'fs'; // TODO: Replace with fs/promises
import { ensureDir, emptyDir } from 'fs-extra';
import fs from 'fs/promises';
import {
  importContext,
  mappingVariableContext,
  arrayVariableContext,
  stateVariableContext,
  constructorContext,
  externalOrPublicFunctionContext,
  internalFunctionContext,
} from './context';
import { exec } from 'child_process';

/**
 * Fixes user-defined types
 * @param type The string of the type to fix
 * @returns The string with the type fixed
 */
export function sanitizeParameterType(type: string): string {
  const regExp = new RegExp(`^(${userDefinedTypes.join('|')}) `);
  return type.replace(regExp, '');
}

/**
 * Explicits a type's storage location, if required
 * @param type The string of the type to explicit
 * @returns The string with the type explicit
 */
export function explicitTypeStorageLocation(type: string): string {
  const regExp = new RegExp(`^(${explicitTypes.join('|')})\\b`);
  if (regExp.test(type) || type.includes('[]')) {
    return `${type} memory`;
  } else {
    return type;
  }
}

/**
 * Reads a template file
 * @param templateName The name of the template
 * @param templatePath The path of the template (if it's nested)
 * @returns The content of the template
 */
export function readTemplate(templateName: string, templatePath: string[] = []): string {
  const fullPath = path.resolve(__dirname, 'templates', ...templatePath, `${templateName}.hbs`);
  return readFileSync(fullPath, { encoding: 'utf8' });
}

/**
 * Compiles a template
 * @param templateName The name of the template
 * @param templatePath The path of the template (if it's nested)
 * @returns The compiled template
 */
export function compileTemplate(templateName: string, templatePath?: string[]): HandlebarsTemplateDelegate<any> {
  const templateContent = readTemplate(templateName, templatePath);
  return Handlebars.compile(templateContent, { noEscape: true });
}

/**
 * Gets the base contract template
 * @returns The contract template
 */
export function getContractTemplate(): HandlebarsTemplateDelegate<any> {
  return compileTemplate('contract-template');
}

/**
 * Gets the smock helper template
 * @returns The helper template
 */
export function getSmockHelperTemplate(): HandlebarsTemplateDelegate<any> {
  return compileTemplate('helper-template');
}

/**
 * Compiles the solidity files in the given directory calling forge build command
 * @param mockContractsDir The directory of the generated contracts
 */
export async function compileSolidityFilesFoundry(rootPath: string, mockContractsDir: string, remappings: string[]) {
  console.log('Compiling contracts...');
  try {
    const solidityFiles: string[] = await getSolidityFilesAbsolutePaths(rootPath, [mockContractsDir]);

    await compileSol(solidityFiles, 'auto', {
      basePath: rootPath,
      remapping: remappings,
      includePath: [rootPath],
    });
  } catch (e) {
    throw new Error(`Error while compiling contracts: ${e}`);
  }
}

export async function getSolidityFilesAbsolutePaths(cwd: string, directories: string[]): Promise<string[]> {
  // Map each directory to a glob promise, searching for .sol files
  const promises = directories.map((directory) => glob(`${directory}/**/*.sol`, { cwd, ignore: [] }));
  const filesArrays = await Promise.all(promises);
  const files = filesArrays.flat();

  return files;
}

export function extractParameters(parameters: VariableDeclaration[]): {
  functionParameters: string[];
  parameterTypes: string[];
  parameterNames: string[];
} {
  const functionParameters = parameters.map((parameter, index) => {
    const typeName: string = sanitizeParameterType(parameter.typeString);
    const paramName: string = parameter.name || `_param${index}`;
    const storageLocation = ['memory', 'calldata'].includes(parameter.storageLocation) ? `${parameter.storageLocation} ` : '';
    return `${typeName} ${storageLocation}${paramName}`;
  });

  const parameterNames = parameters.map((parameter, index) => parameter.name || `_param${index}`);

  const parameterTypes = parameters.map((parameter) => {
    // If the parameter is a user-defined value type, we need to get the underlying type
    if (parameter.vType instanceof UserDefinedTypeName) {
      if (parameter.vType.vReferencedDeclaration instanceof UserDefinedValueTypeDefinition) {
        return sanitizeParameterType(parameter.vType.vReferencedDeclaration.underlyingType.typeString);
      }
    }

    return sanitizeParameterType(parameter.typeString);
  });

  return {
    functionParameters,
    parameterTypes,
    parameterNames,
  };
}

export function extractReturnParameters(returnParameters: VariableDeclaration[]): {
  functionReturnParameters: string[];
  returnParameterTypes: string[];
  returnParameterNames: string[];
  returnExplicitParameterTypes: string[];
} {
  const functionReturnParameters = returnParameters.map((parameter: VariableDeclaration, index: number) => {
    const typeName: string = sanitizeParameterType(parameter.typeString);
    const paramName: string = parameter.name || `_returnParam${index}`;
    const storageLocation = ['memory', 'calldata'].includes(parameter.storageLocation) ? `${parameter.storageLocation} ` : '';
    return `${typeName} ${storageLocation}${paramName}`;
  });

  const returnParameterTypes = returnParameters.map((parameter) => sanitizeParameterType(parameter.typeString));
  const returnParameterNames = returnParameters.map((parameter, index) => parameter.name || `_returnParam${index}`);
  const returnExplicitParameterTypes = returnParameters.map((parameter) =>
    sanitizeParameterType(explicitTypeStorageLocation(parameter.typeString)),
  );

  return {
    functionReturnParameters,
    returnParameterTypes,
    returnParameterNames,
    returnExplicitParameterTypes,
  };
}

export async function renderNodeMock(node: ASTNode): Promise<string> {
  const partial = partialName(node);
  if (!partial) return '';

  const CONTEXT_RETRIEVERS = {
    'mapping-state-variable': mappingVariableContext,
    'array-state-variable': arrayVariableContext,
    'state-variable': stateVariableContext,
    constructor: constructorContext,
    'external-or-public-function': externalOrPublicFunctionContext,
    'internal-function': internalFunctionContext,
    import: importContext,
  };

  const contextRetriever = CONTEXT_RETRIEVERS[partial];
  if (!contextRetriever) return '';

  const context = contextRetriever(node);
  // TODO: Handle a possible invalid partial name
  const template = compileTemplate(partial, ['partials']);
  return template(context);
}

export function partialName(node: ASTNode): string {
  if (node instanceof VariableDeclaration) {
    if (node.typeString.startsWith('mapping')) {
      return 'mapping-state-variable';
    } else if (node.typeString.includes('[]')) {
      return 'array-state-variable';
    } else {
      return 'state-variable';
    }
  } else if (node instanceof FunctionDefinition) {
    if (node.isConstructor) {
      return 'constructor';
    } else if (node.kind === FunctionKind.Fallback || node.kind === FunctionKind.Receive) {
      return null;
    } else if (node.visibility === 'external' || node.visibility === 'public') {
      return 'external-or-public-function';
    } else if (node.visibility === 'internal' && node.virtual) {
      return 'internal-function';
    }
  } else if (node instanceof ImportDirective) {
    return 'import';
  }

  // TODO: Handle unknown nodes
}

export async function getRemappings(rootPath: string): Promise<string[]> {
  // First try the remappings.txt file
  try {
    return await exports.getRemappingsFromFile(path.join(rootPath, 'remappings.txt'));
  } catch (e) {
    // If the remappings file does not exist, try foundry.toml
    try {
      return await exports.getRemappingsFromConfig(path.join(rootPath, 'foundry.toml'));
    } catch {
      // If neither file exists, try to generate the remappings using forge
      try {
        return await exports.getRemappingsFromForge();
      } catch {
        return [];
      }
    }
  }
}

export async function getRemappingsFromFile(remappingsPath: string): Promise<string[]> {
  const remappingsContent = await fs.readFile(remappingsPath, 'utf8');

  return remappingsContent
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length)
    .map((line) => sanitizeRemapping(line));
}

export async function getRemappingsFromConfig(foundryConfigPath: string): Promise<string[]> {
  const foundryConfigContent = await fs.readFile(foundryConfigPath, 'utf8');
  const regex = /remappings[\s|\n]*=[\s\n]*\[(?<remappings>[^\]]+)]/;
  const matches = foundryConfigContent.match(regex);
  if (matches) {
    return matches
      .groups!.remappings.split(',')
      .map((line) => line.trim())
      .map((line) => line.replace(/["']/g, ''))
      .filter((line) => line.length)
      .map((line) => sanitizeRemapping(line));
  } else {
    throw new Error('No remappings found in foundry.toml');
  }
}

/**
 * Returns the remappings generated by forge
 * @returns {Promise<string[]>} - The list of remappings
 */
export async function getRemappingsFromForge(): Promise<string[]> {
  const remappingsContent = await new Promise<string>((resolve, reject) =>
    exec('forge remappings', { encoding: 'utf8' }, (error, stdout) => (error ? reject(error) : resolve(stdout))),
  );
  return remappingsContent
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length)
    .map((line) => sanitizeRemapping(line));
}

export function sanitizeRemapping(line: string): string {
  // Make sure the key and the value both either have or don't have a trailing slash
  const [key, value] = line.split('=');
  const slashNeeded = key.endsWith('/');

  if (slashNeeded) {
    return value.endsWith('/') ? line : `${line}/`;
  } else {
    return value.endsWith('/') ? line.slice(0, -1) : line;
  }
}

export async function emptySmockDirectory(mocksDirectory: string) {
  // Create the directory if it doesn't exist
  try {
    await ensureDir(mocksDirectory);
  } catch (error) {
    console.error('Error while creating the mock directory: ', error);
  }

  // Empty the directory, if it exists
  try {
    await emptyDir(mocksDirectory);
  } catch (error) {
    console.error('Error while trying to empty the mock directory: ', error);
  }
}

export function getTestImport(remappings: string[]): string {
  const module = 'forge-std';

  for (const remapping of remappings) {
    const [alias, path] = remapping.split('='); // Split remapping into alias and path

    if (alias.startsWith(module) && path.includes(module)) {
      const srcPath = path.includes('/src/') ? '' : `src/`;
      return `${alias}${srcPath}Test.sol`;
    }
  }

  return 'forge-std/src/Test.sol';
}

export async function getSourceUnits(
  rootPath: string,
  contractsDirectories: string[],
  ignoreDirectories: string[],
  remappings: string[],
): Promise<SourceUnit[]> {
  const files: string[] = await getSolidityFilesAbsolutePaths(rootPath, contractsDirectories);
  const solidityFiles = files.filter((file) => !ignoreDirectories.some((directory) => file.includes(directory)));

  const compiledFiles = await compileSol(solidityFiles, 'auto', {
    basePath: rootPath,
    remapping: remappings,
    includePath: [rootPath],
  });

  const sourceUnits = new ASTReader()
    .read(compiledFiles.data, ASTKind.Any, compiledFiles.files)
    // Skip source units that are not in the contracts directories
    .filter((sourceUnit) => contractsDirectories.some((directory) => sourceUnit.absolutePath.includes(directory)));

  return sourceUnits;
}

export function smockableNode(node: ASTNode): boolean {
  if (node instanceof VariableDeclaration) {
    // If the state variable is constant then we don't need to mock it
    if (node.constant || node.mutability === 'immutable') return false;
    // If the state variable is private we don't mock it
    if (node.visibility === 'private') return false;
  } else if (node instanceof FunctionDefinition) {
    if (node.isConstructor && (node.parent as ContractDefinition)?.abstract) return false;
  } else if (!(node instanceof FunctionDefinition)) {
    // Only process variables and functions
    return false;
  }

  return true;
}

/**
 * Renders the abstract functions that are not implemented in the current contract
 * @param contract The contract to render the abstract functions from
 * @returns The content of the functions
 */
export async function renderAbstractUnimplementedFunctions(contract: ContractDefinition): Promise<string> {
  let content = '';

  const currentSelectors = [...contract.vStateVariables, ...contract.vFunctions].map((node) => node.raw?.functionSelector);
  const inheritedSelectors = getAllInheritedSelectors(contract);

  // If the abstract contract has a constructor, we need to add it to the selectors
  if (contract.vConstructor) {
    const constructors = inheritedSelectors['constructor'];
    inheritedSelectors['constructor'] = {
      implemented: constructors.implemented,
      function: contract.vConstructor,
      contracts: constructors.contracts ? constructors.contracts.add(contract.name) : new Set([contract.name]),
      constructors: constructors.constructors ? [...constructors.constructors, contract.vConstructor] : [contract.vConstructor],
    };
  }

  for (const selector in inheritedSelectors) {
    // Skip the functions that are already implemented in the current contract
    if (currentSelectors.includes(selector)) continue;

    // Skip the functions that are already implemented in the inherited contracts
    if (inheritedSelectors[selector].implemented) continue;

    const func = inheritedSelectors[selector].function;

    injectSelectors(func, inheritedSelectors);
    content += await renderNodeMock(func);
  }

  return content;
}

/**
 * Gets all the inherited selectors of a contract
 * @dev This function is recursive, loops through all the base contracts and their base contracts
 * @param contract The contract to get the inherited selectors from
 * @param selectors The map of selectors to update
 * @returns The updated map of selectors
 */
export const getAllInheritedSelectors = (contract: ContractDefinition, selectors: SelectorsMap = {}): SelectorsMap => {
  for (const base of contract.vLinearizedBaseContracts) {
    if (base.id === contract.id) continue;

    for (const variable of base.vStateVariables) {
      const selector = variable.raw?.functionSelector;

      if (!selector) continue;

      selectors[selector] = {
        implemented: true,
      };
    }

    for (const func of base.vFunctions) {
      let selector = func.raw?.functionSelector;
      selector = func.isConstructor ? 'constructor' : selector;

      if (!selector) continue;

      const contracts = selectors[selector]?.contracts;
      const isImplemented = selectors[selector]?.implemented;
      const constructors = selectors[selector]?.constructors || [];

      selectors[selector] = {
        implemented: isImplemented || (!func.isConstructor && func.implemented),
        contracts: contracts ? contracts.add(base.name) : new Set([base.name]),
        function: func,
        constructors: func.isConstructor ? constructors.concat(func) : constructors,
      };
    }

    getAllInheritedSelectors(base, selectors);
  }

  return selectors;
};

/**
 * Injects the selectors into the function definition
 * @param node The node to inject the selectors into
 * @param selectors The map of selectors to inject
 */
export const injectSelectors = (node: ASTNode, selectors: SelectorsMap): void => {
  if (node instanceof FunctionDefinition) {
    const nodeWithSelectors = node as FullFunctionDefinition;
    nodeWithSelectors.selectors = selectors;
    nodeWithSelectors.visibility = FunctionVisibility.Public;
  }
};

/**
 * Extracts the function overrides to render
 * @param node The node to extract the overrides from
 * @returns The overrides string or null if there are no overrides
 */
export const extractOverrides = (node: FullFunctionDefinition): string | null => {
  if (!node.selectors) return null;

  const selector = node.raw?.functionSelector;
  const contractsSet = node.selectors[selector];

  if (!contractsSet || contractsSet.contracts.size <= 1) return null;

  return `(${Array.from(contractsSet.contracts).join(', ')})`;
};

/**
 * Returns the fields of a struct
 * @param node The struct to extract the fields from
 * @returns The fields of the struct
 */
const getStructFields = (node: TypeName) => {
  const isStruct = node.typeString?.startsWith('struct');
  if (!isStruct) return [];

  const isArray = node.typeString.includes('[]');
  const structTypeName = (isArray ? (node as ArrayTypeName).vBaseType : node) as UserDefinedTypeName;
  if (!structTypeName) return [];

  const struct = structTypeName?.vReferencedDeclaration;
  if (!struct) return [];

  return struct.children || [];
};

/**
 * Returns if there are nested mappings in a struct
 * @dev This function is recursive, loops through all the fields of the struct and nested structs
 * @param node The struct to extract the mappings from
 * @returns True if there are nested mappings, false otherwise
 */
export const hasNestedMappings = (node: TypeName): boolean => {
  let result = false;

  const fields = getStructFields(node);

  for (const member of fields) {
    const field = member as TypeName;
    if (!field.typeString) continue;

    if (field.typeString.startsWith('mapping')) return true;

    if (field.typeString.startsWith('struct')) {
      const fieldType = (field as VariableDeclaration).vType;
      const isArray = field.typeString.includes('[]');

      const nestedStruct = isArray ? (fieldType as ArrayTypeName).vBaseType : fieldType;

      result = result || hasNestedMappings(nestedStruct);
    }
  }

  return result;
};

/**
 * Extracts the fields of a struct
 * @dev returns the fields names of the struct as a string array
 * @param node The struct to extract the fields from
 * @returns The fields names of the struct
 */
export const extractStructFieldsNames = (node: TypeName): string[] | null => {
  const fields = getStructFields(node);

  return fields.map((field) => (field as VariableDeclaration).name).filter((name) => name);
};

/**
 * Extracts the parameters of the constructors of a contract
 * @param node The function to extract the constructors parameters from
 * @returns The parameters and contracts of the constructors
 */
export const extractConstructorsParameters = (
  node: FullFunctionDefinition,
): {
  parameters: string[];
  contracts: string[];
} => {
  let constructors: FunctionDefinition[];

  if (node?.selectors?.['constructor']?.constructors?.length > 1) {
    constructors = node.selectors['constructor'].constructors;
  } else {
    constructors = [node];
  }

  const allParameters: string[] = [];
  const allContracts: string[] = [];

  for (const func of constructors) {
    const { functionParameters: parameters, parameterNames } = extractParameters(func.vParameters.vParameters);
    const contractName = (func.vScope as ContractDefinition).name;
    const contractValue = `${contractName}(${parameterNames.join(', ')})`;

    if (allContracts.includes(contractValue)) continue;

    allParameters.push(...parameters);
    allContracts.push(contractValue);
  }

  return {
    parameters: allParameters,
    contracts: allContracts,
  };
};
