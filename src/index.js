





























import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import '@atlaskit/css-reset';
import './initial-data';
import initialData, { initialDataMock } from "./initial-data";
import Column from './column';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import styled from "styled-components";

const axios = require('axios').default;

const Container = styled.div`
  display: flex;
`;

class InnerList extends React.PureComponent {
  render() {
    const { column, taskMap, index } = this.props;
    const tasks = column.taskIds.map(taskId => taskMap[taskId]);
    return <Column key={column.id} column={column} tasks={tasks} index={index} />
  }
}

class App extends React.Component {
  state = initialData;
  // state = initialDataMock;

  async componentDidMount() {
    try {
      const responses = await Promise.all([
        axios.get('https://coomboard.herokuapp.com/collection/column_order'),
        axios.get('https://coomboard.herokuapp.com/collection/columns'),
        axios.get('https://coomboard.herokuapp.com/collection/tasks'),
      ]);
      console.log(responses)
      const columnOrder = responses[0].data.map(col => col._id);
      const columns = Object.fromEntries(responses[1].data.map((col) => [col._id, { id: col._id, title: col.title, taskIds: col.taskIds }]));
      const tasks = responses[2].data.reduce(function(acc, e) {
        acc[e._id] = { id: e._id, content: e.content };
        return acc;
      }, {});
      const newState = {
        ...this.state,
        tasks,
        columns,
        columnOrder,
        hasData: true,
      };
      this.setState(newState);
    } catch(err) {
      console.log(err);
    }
  }

  onDragEnd = result => {
    const { destination, source, draggableId, type } = result;

    if(!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Reorder by columns
    if (type === 'column') {
      const newColumnOrder = Array.from(this.state.columnOrder);
      newColumnOrder.splice(source.index, 1);
      newColumnOrder.splice(destination.index, 0, draggableId);

      const newState = {
        ...this.state,
        columnOrder: newColumnOrder,
      };
      this.setState(newState);
      return;
    }

    // Reorder by tasks
    const start = this.state.columns[source.droppableId];
    const finish = this.state.columns[destination.droppableId];

    if(start === finish) {
      const newTaskIds = Array.from(start.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      const newColumn = {
        ...start,
        taskIds: newTaskIds,
      };

      const newState = {
        ...this.state,
        columns: {
          ...this.state.columns,
          [newColumn.id]: newColumn,
        },
      };

      this.setState(newState);
      return;
    }

    // Moving from one list to another
    const startTaskIds = Array.from(start.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStart = {
      ...start,
      taskIds: startTaskIds,
    };
    const finishTaskIds = Array.from(finish.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinish = {
      ...finish,
      taskIds: finishTaskIds,
    };

    const newState = {
      ...this.state,
      columns: {
        ...this.state.columns,
        [newStart.id]: newStart,
        [newFinish.id]: newFinish,
      },
    };
    this.setState(newState);
  };

  render() {
    // if (!this.state.hasData) {
    //   return <div>Loading...</div>
    // }
    return (
      <div>
        <DragDropContext onDragEnd={this.onDragEnd}>
          <Droppable
            droppableId="all-columns"
            direction="horizontal"
            type="column"
          >
            {provided => (
              <Container
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {this.state.columnOrder.map((columnId, index) => {
                  const column = this.state.columns[columnId];

                  return (
                    <InnerList
                      key={column.id}
                      column={column}
                      taskMap={this.state.tasks}
                      index={index}
                    />
                  );
                })}
                {provided.placeholder}
              </Container>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    );
  }
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
