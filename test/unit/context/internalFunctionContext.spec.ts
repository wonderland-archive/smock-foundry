import { expect } from 'chai';
import { DataLocation, FunctionStateMutability, FunctionVisibility, UserDefinedTypeName, UserDefinedValueTypeDefinition } from 'solc-typed-ast';
import {
  mockElementaryTypeName,
  mockFunctionDefinition,
  mockParameterList,
  mockUserDefinedTypeName,
  mockVariableDeclaration,
} from '../../mocks';
import { internalFunctionContext } from '../../../src/context';

describe('internalFunctionContext', () => {
  const defaultAttributes = {
    name: 'testInternalFunction',
    visibility: FunctionVisibility.Internal,
    virtual: true,
    vParameters: mockParameterList({ vParameters: [] }),
    vReturnParameters: mockParameterList({ vParameters: [] }),
    implemented: true,
  };

  it('throws an error if the function is not internal', () => {
    for (const visibility in FunctionVisibility) {
      if (FunctionVisibility[visibility] === FunctionVisibility.Internal) continue;
      const node = mockFunctionDefinition({ ...defaultAttributes, visibility: FunctionVisibility[visibility] });
      expect(() => internalFunctionContext(node)).to.throw('The function is not internal');
    }
  });

  it('throws an error if the function is not virtual', () => {
    const node = mockFunctionDefinition({ ...defaultAttributes, virtual: false });
    expect(() => internalFunctionContext(node)).to.throw('The function is not virtual');
  });

  it('processes functions without parameters and returned values', () => {
    const node = mockFunctionDefinition(defaultAttributes);
    const context = internalFunctionContext(node);

    expect(context).to.eql({
      functionName: 'testInternalFunction',
      signature: 'testInternalFunction()',
      parameters: '',
      inputs: '',
      outputs: '',
      inputNames: [],
      outputNames: [],
      inputTypes: [],
      outputTypes: [],
      implemented: true,
      isView: false,
      explicitOutputTypes: [],
      isPure: false,
    });
  });

  it('processes named parameters', () => {
    const parameters = [
      mockVariableDeclaration({ name: 'a', typeString: 'uint256' }),
      mockVariableDeclaration({ name: 'b', typeString: 'boolean' }),
    ];
    const node = mockFunctionDefinition({ ...defaultAttributes, vParameters: mockParameterList({ vParameters: parameters }) });
    const context = internalFunctionContext(node);

    expect(context).to.eql({
      functionName: 'testInternalFunction',
      signature: 'testInternalFunction(uint256,boolean)',
      parameters: 'uint256 a, boolean b',
      inputs: 'uint256 a, boolean b',
      outputs: '',
      inputNames: ['a', 'b'],
      outputNames: [],
      inputTypes: ['uint256', 'boolean'],
      outputTypes: [],
      implemented: true,
      isView: false,
      explicitOutputTypes: [],
      isPure: false,
    });
  });

  it('processes unnamed parameters', () => {
    const parameters = [mockVariableDeclaration({ typeString: 'uint256' }), mockVariableDeclaration({ typeString: 'boolean' })];
    const node = mockFunctionDefinition({ ...defaultAttributes, vParameters: mockParameterList({ vParameters: parameters }) });
    const context = internalFunctionContext(node);

    expect(context).to.eql({
      functionName: 'testInternalFunction',
      signature: 'testInternalFunction(uint256,boolean)',
      parameters: 'uint256 _param0, boolean _param1',
      inputs: 'uint256 _param0, boolean _param1',
      outputs: '',
      inputNames: ['_param0', '_param1'],
      outputNames: [],
      inputTypes: ['uint256', 'boolean'],
      outputTypes: [],
      implemented: true,
      isView: false,
      explicitOutputTypes: [],
      isPure: false,
    });
  });

  it('processes unnamed returned parameters', () => {
    const parameters = [mockVariableDeclaration({ typeString: 'uint256' }), mockVariableDeclaration({ typeString: 'boolean' })];
    const node = mockFunctionDefinition({ ...defaultAttributes, vReturnParameters: mockParameterList({ vParameters: parameters }) });
    const context = internalFunctionContext(node);

    expect(context).to.eql({
      functionName: 'testInternalFunction',
      signature: 'testInternalFunction()',
      parameters: 'uint256 _returnParam0, boolean _returnParam1',
      inputs: '',
      outputs: 'uint256 _returnParam0, boolean _returnParam1',
      inputNames: [],
      outputNames: ['_returnParam0', '_returnParam1'],
      inputTypes: [],
      outputTypes: ['uint256', 'boolean'],
      implemented: true,
      isView: false,
      explicitOutputTypes: ['uint256', 'boolean'],
      isPure: false,
    });
  });

  it('processes named returned parameters', () => {
    const parameters = [
      mockVariableDeclaration({ name: 'a', typeString: 'uint256' }),
      mockVariableDeclaration({ name: 'b', typeString: 'boolean' }),
    ];
    const node = mockFunctionDefinition({ ...defaultAttributes, vReturnParameters: mockParameterList({ vParameters: parameters }) });
    const context = internalFunctionContext(node);

    expect(context).to.eql({
      functionName: 'testInternalFunction',
      signature: 'testInternalFunction()',
      parameters: 'uint256 a, boolean b',
      inputs: '',
      outputs: 'uint256 a, boolean b',
      inputNames: [],
      outputNames: ['a', 'b'],
      inputTypes: [],
      outputTypes: ['uint256', 'boolean'],
      implemented: true,
      isView: false,
      explicitOutputTypes: ['uint256', 'boolean'],
      isPure: false,
    });
  });

  it('recognizes storage location of parameters', () => {
    const parameters = [
      mockVariableDeclaration({ name: 'a', typeString: 'uint256', storageLocation: DataLocation.Storage }),
      mockVariableDeclaration({ name: 'b', typeString: 'string', storageLocation: DataLocation.Memory }),
      mockVariableDeclaration({ name: 'c', typeString: 'bytes', storageLocation: DataLocation.CallData }),
      mockVariableDeclaration({ name: 'd', typeString: 'boolean', storageLocation: DataLocation.Default }),
    ];
    const node = mockFunctionDefinition({ ...defaultAttributes, vParameters: mockParameterList({ vParameters: parameters }) });
    const context = internalFunctionContext(node);

    expect(context).to.eql({
      functionName: 'testInternalFunction',
      signature: 'testInternalFunction(uint256,string,bytes,boolean)',
      parameters: 'uint256 a, string memory b, bytes calldata c, boolean d',
      inputs: 'uint256 a, string memory b, bytes calldata c, boolean d',
      outputs: '',
      inputNames: ['a', 'b', 'c', 'd'],
      outputNames: [],
      inputTypes: ['uint256', 'string', 'bytes', 'boolean'],
      outputTypes: [],
      implemented: true,
      isView: false,
      explicitOutputTypes: [],
      isPure: false,
    });
  });

  it('recognizes storage location of returned parameters', () => {
    const parameters = [
      mockVariableDeclaration({ name: 'a', typeString: 'uint256', storageLocation: DataLocation.Storage }),
      mockVariableDeclaration({ name: 'b', typeString: 'string', storageLocation: DataLocation.Memory }),
      mockVariableDeclaration({ name: 'c', typeString: 'bytes', storageLocation: DataLocation.CallData }),
      mockVariableDeclaration({ name: 'd', typeString: 'boolean', storageLocation: DataLocation.Default }),
    ];
    const node = mockFunctionDefinition({ ...defaultAttributes, vReturnParameters: mockParameterList({ vParameters: parameters }) });
    const context = internalFunctionContext(node);

    expect(context).to.eql({
      functionName: 'testInternalFunction',
      signature: 'testInternalFunction()',
      parameters: 'uint256 a, string memory b, bytes calldata c, boolean d',
      inputs: '',
      outputs: 'uint256 a, string memory b, bytes calldata c, boolean d',
      inputNames: [],
      outputNames: ['a', 'b', 'c', 'd'],
      inputTypes: [],
      outputTypes: ['uint256', 'string', 'bytes', 'boolean'],
      implemented: true,
      isView: false,
      explicitOutputTypes: ['uint256', 'string memory', 'bytes memory', 'boolean'],
      isPure: false,
    });
  });

  it('determines whether the function is view or not', () => {
    for (const stateMutability in FunctionStateMutability) {
      const isView = FunctionStateMutability[stateMutability] === FunctionStateMutability.View;
      const isPure = FunctionStateMutability[stateMutability] === FunctionStateMutability.Pure;
      const node = mockFunctionDefinition({ ...defaultAttributes, stateMutability: FunctionStateMutability[stateMutability] });
      const context = internalFunctionContext(node);
      expect(context.isView).to.be.equal(isView || isPure);
    }
  });

  it('determines whether the function is pure or not', () => {
    for (const stateMutability in FunctionStateMutability) {
      const isPure = FunctionStateMutability[stateMutability] === FunctionStateMutability.Pure;
      const node = mockFunctionDefinition({ ...defaultAttributes, stateMutability: FunctionStateMutability[stateMutability] });
      const context = internalFunctionContext(node);
      expect(context.isPure).to.be.equal(isPure);
    }
  });

  it('determines whether the function is implemented or not', () => {
    for (const implemented of [true, false]) {
      const node = mockFunctionDefinition({ ...defaultAttributes, implemented: implemented });
      const context = internalFunctionContext(node);
      expect(context.implemented).to.be.equal(implemented);
    }
  });

  it('process functions with user defined value types', () => {
    const vReferencedDeclaration = new UserDefinedValueTypeDefinition(0, '', 'MyType', mockElementaryTypeName({ typeString: 'uint256' }));

    const vType = Object.create(UserDefinedTypeName.prototype, {
      vReferencedDeclaration: { value: vReferencedDeclaration },
    });

    const node = mockFunctionDefinition({
      ...defaultAttributes,
      vParameters: mockParameterList({
        vParameters: [
          mockVariableDeclaration({
            name: 'a',
            typeString: 'MyType',
            vType,
          }),
        ],
      }),
    });

    const context = internalFunctionContext(node);

    expect(context).to.eql({
      functionName: 'testInternalFunction',
      signature: 'testInternalFunction(uint256)',
      parameters: 'MyType a',
      inputs: 'MyType a',
      outputs: '',
      inputNames: ['a'],
      outputNames: [],
      inputTypes: ['uint256'],
      outputTypes: [],
      implemented: true,
      isView: false,
      explicitOutputTypes: [],
      isPure: false,
    });
  });

  it('process structs return parameters', () => {
    const parameters = [
      mockVariableDeclaration({
        typeString: 'struct MyStruct',
        vType: mockUserDefinedTypeName({
          typeString: 'struct MyStruct',
          vReferencedDeclaration: mockUserDefinedTypeName({
            children: [mockVariableDeclaration({ name: 'field1', typeString: 'uint256' })],
          }),
        }),
      }),
    ];
    const node = mockFunctionDefinition({ ...defaultAttributes, vReturnParameters: mockParameterList({ vParameters: parameters }) });
    const context = internalFunctionContext(node);

    expect(context).to.eql({
      functionName: 'testInternalFunction',
      signature: 'testInternalFunction()',
      parameters: 'MyStruct _returnParam0',
      inputs: '',
      outputs: 'MyStruct _returnParam0',
      inputNames: [],
      outputNames: ['_returnParam0'],
      inputTypes: [],
      outputTypes: ['MyStruct'],
      implemented: true,
      isView: false,
      explicitOutputTypes: ['MyStruct memory'],
      isPure: false,
    });
  });
});
